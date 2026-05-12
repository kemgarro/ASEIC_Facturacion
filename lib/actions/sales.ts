'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { type CartItem } from '@/lib/store/cart'
import { logAudit } from '@/lib/actions/audit'
import { getActivePromotions } from '@/lib/actions/promotions'
import { calcTotal } from '@/lib/promotions/calc'

export type PaymentMethod = 'efectivo' | 'sinpe' | 'mixto'

export interface PaymentInfo {
  method: PaymentMethod
  cashAmount?: number
  sinpeAmount?: number
  referenceCode?: string
}

export type SaleResult = { success: true; saleId: number } | { success: false; error: string }

const TOTAL_TOLERANCE = 0.01

const PaymentSchema = z
  .object({
    method: z.enum(['efectivo', 'sinpe', 'mixto']),
    cashAmount: z.number().nonnegative().optional(),
    sinpeAmount: z.number().nonnegative().optional(),
    referenceCode: z.string().trim().min(1).optional(),
  })
  .refine(
    (p) => p.method !== 'sinpe' || (p.referenceCode && p.referenceCode.length > 0),
    { message: 'Código de referencia requerido para SINPE', path: ['referenceCode'] }
  )

function validatePayment(payment: PaymentInfo | undefined, total: number): string | null {
  if (!payment) return null
  const parsed = PaymentSchema.safeParse(payment)
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Pago inválido'
  }
  if (payment.method === 'mixto') {
    const cash = payment.cashAmount ?? 0
    const sinpe = payment.sinpeAmount ?? 0
    if (Math.abs(cash + sinpe - total) > TOTAL_TOLERANCE) {
      return `Suma de pago (₡${(cash + sinpe).toFixed(2)}) no coincide con el total (₡${total.toFixed(2)})`
    }
  }
  return null
}

export async function createSale(
  items: CartItem[],
  customerId?: number | null,
  payment?: PaymentInfo
): Promise<SaleResult> {
  if (items.length === 0) return { success: false, error: 'Carrito vacío' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return { success: false, error: 'Perfil no encontrado' }

  // Recalcular total en el servidor con las promociones activas reales — nunca confiar en el cliente
  const activePromotions = await getActivePromotions()
  const total = calcTotal(items, activePromotions)

  const paymentError = validatePayment(payment, total)
  if (paymentError) return { success: false, error: paymentError }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      seller_id: user.id,
      customer_id: customerId ?? null,
      total: total.toFixed(2),
      status: 'completed',
      payment_method: payment?.method ?? 'efectivo',
      cash_amount: payment?.cashAmount ?? null,
      sinpe_amount: payment?.sinpeAmount ?? null,
      reference_code: payment?.referenceCode ?? null,
    })
    .select('id')
    .single()

  if (saleError || !sale) return { success: false, error: saleError?.message ?? 'Error al crear venta' }

  // Decremento de stock vía RPC atómica (UPDATE ... WHERE stock >= qty bajo row lock).
  // Evita race conditions cuando varios cajeros venden el mismo producto a la vez.
  const decremented: { id: number; quantity: number }[] = []
  for (const item of items) {
    const { data: newStock, error: rpcErr } = await supabase.rpc('decrement_stock', {
      p_product_id: item.id,
      p_qty: item.quantity,
    })

    if (rpcErr) {
      console.error('[createSale] decrement_stock error', { itemId: item.id, qty: item.quantity, rpcErr })
      await rollbackSale(supabase, sale.id, decremented)
      return { success: false, error: `Error al actualizar stock para ${item.name} (id=${item.id}): ${rpcErr.message}` }
    }
    if (newStock === null) {
      const { data: actual } = await supabase
        .from('products')
        .select('id, name, stock, active')
        .eq('id', item.id)
        .maybeSingle()
      console.error('[createSale] decrement_stock returned null', {
        cartItem: { id: item.id, name: item.name, qty: item.quantity },
        productInDb: actual,
      })
      await rollbackSale(supabase, sale.id, decremented)
      const detail = actual
        ? `disponible=${actual.stock}, activo=${actual.active}`
        : `producto id=${item.id} no existe en DB`
      return {
        success: false,
        error: `Stock insuficiente para "${item.name}" (id=${item.id}, pidió=${item.quantity}, ${detail})`,
      }
    }

    decremented.push({ id: item.id, quantity: item.quantity })
  }

  const saleItems = items.map((i) => ({
    sale_id: sale.id,
    product_id: i.id,
    quantity: i.quantity,
    unit_price: i.price,
    subtotal: i.price * i.quantity,
  }))

  const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
  if (itemsError) {
    await rollbackSale(supabase, sale.id, decremented)
    return { success: false, error: itemsError.message }
  }

  const paymentDesc = payment?.method === 'sinpe'
    ? `Venta #${sale.id} — SINPE${payment.referenceCode ? ` (ref: ${payment.referenceCode})` : ''}`
    : payment?.method === 'mixto'
    ? `Venta #${sale.id} — Mixto (₡${(payment.cashAmount ?? 0).toFixed(2)} efectivo + ₡${(payment.sinpeAmount ?? 0).toFixed(2)} SINPE)`
    : `Venta #${sale.id} — Efectivo`

  const sellerName = profile.full_name ?? user.email ?? user.id

  const { error: cashErr } = await supabase.from('cash_movements').insert({
    type: 'ingreso',
    amount: total.toFixed(2),
    description: paymentDesc,
    category: 'venta',
    reference_id: sale.id,
    created_by: user.id,
  })
  if (cashErr) {
    console.error('[sale] cash_movement insert failed', { saleId: sale.id, error: cashErr.message })
  }

  await logAudit(supabase, user.id, sellerName, 'venta_creada', 'sale', sale.id, {
    amount: total,
    description: paymentDesc,
    items: items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
  })

  revalidatePath('/ventas')
  revalidatePath('/ventas/historial')
  revalidatePath('/dashboard')
  revalidatePath('/productos')

  return { success: true, saleId: sale.id }
}

async function rollbackSale(
  supabase: Awaited<ReturnType<typeof createClient>>,
  saleId: number,
  decremented: { id: number; quantity: number }[]
) {
  for (const d of decremented) {
    const { error } = await supabase.rpc('increment_stock', {
      p_product_id: d.id,
      p_qty: d.quantity,
    })
    if (error) console.error('[rollback] failed to restore stock', { saleId, productId: d.id, error: error.message })
  }
  const { error: delErr } = await supabase.from('sales').delete().eq('id', saleId)
  if (delErr) console.error('[rollback] failed to delete sale', { saleId, error: delErr.message })
}

export async function cancelSale(saleId: number, reason: string): Promise<SaleResult> {
  if (!reason.trim()) return { success: false, error: 'Motivo requerido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { success: false, error: 'Solo administradores pueden anular ventas' }

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, status, total, sale_items(product_id, quantity)')
    .eq('id', saleId)
    .single()

  if (saleErr || !sale) return { success: false, error: 'Venta no encontrada' }
  if (sale.status === 'cancelled') return { success: false, error: 'La venta ya está anulada' }

  const { error: cancelError } = await supabase
    .from('sales')
    .update({
      status: 'cancelled',
      cancellation_reason: reason.trim(),
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', saleId)

  if (cancelError) return { success: false, error: cancelError.message }

  const saleItems = (sale.sale_items as { product_id: number; quantity: number }[]) ?? []
  const restoreFailures: number[] = []
  for (const item of saleItems) {
    const { data: newStock, error: rpcErr } = await supabase.rpc('increment_stock', {
      p_product_id: item.product_id,
      p_qty: item.quantity,
    })
    if (rpcErr || newStock === null) restoreFailures.push(item.product_id)
  }

  const adminName = profile.full_name ?? user.email ?? user.id

  await supabase.from('cash_movements').insert({
    type: 'egreso',
    amount: sale.total,
    description: `Anulación venta #${saleId} — ${reason.trim()}`,
    category: 'anulacion',
    reference_id: saleId,
    created_by: user.id,
  })

  await logAudit(supabase, user.id, adminName, 'venta_anulada', 'sale', saleId, {
    amount: Number(sale.total),
    description: `Venta #${saleId} anulada — ${reason.trim()}`,
    reason: reason.trim(),
    stock_restore_failures: restoreFailures,
  })

  revalidatePath('/ventas/historial')
  revalidatePath('/dashboard')
  revalidatePath('/productos')

  if (restoreFailures.length > 0) {
    return {
      success: false,
      error: `Venta anulada pero falló la restauración de stock para producto(s): ${restoreFailures.join(', ')}. Revisar inventario manualmente.`,
    }
  }

  return { success: true, saleId }
}

export async function deleteSale(saleId: number, reason: string): Promise<SaleResult> {
  if (!reason.trim()) return { success: false, error: 'Motivo requerido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { success: false, error: 'Solo administradores pueden eliminar ventas' }

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, status, total, payment_method, created_at, sale_items(product_id, quantity, unit_price)')
    .eq('id', saleId)
    .single()

  if (saleErr || !sale) return { success: false, error: 'Venta no encontrada' }

  const saleItems = (sale.sale_items as { product_id: number; quantity: number; unit_price: number }[]) ?? []

  // Si la venta estaba 'completed' restauramos stock; si ya estaba 'cancelled'
  // el stock ya fue restaurado por cancelSale y no debemos sumar de nuevo.
  const restoreFailures: number[] = []
  if (sale.status === 'completed') {
    for (const item of saleItems) {
      const { data: newStock, error: rpcErr } = await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_qty: item.quantity,
      })
      if (rpcErr || newStock === null) restoreFailures.push(item.product_id)
    }
  }

  // Borrar movimientos de caja vinculados a esta venta (ingreso original
  // y, si existe, el egreso de anulación). Los movimientos están enlazados
  // por reference_id = saleId con category in ('venta','anulacion').
  const { error: cashErr } = await supabase
    .from('cash_movements')
    .delete()
    .eq('reference_id', saleId)
    .in('category', ['venta', 'anulacion'])
  if (cashErr) console.error('[delete-sale] failed to delete cash movements', { saleId, error: cashErr.message })

  // Eliminar la venta. sale_items debería caer por cascade FK; si no,
  // borramos explícitamente como red de seguridad.
  await supabase.from('sale_items').delete().eq('sale_id', saleId)
  const { error: delErr } = await supabase.from('sales').delete().eq('id', saleId)
  if (delErr) return { success: false, error: `Error al eliminar venta: ${delErr.message}` }

  const adminName = profile.full_name ?? user.email ?? user.id

  await logAudit(supabase, user.id, adminName, 'venta_eliminada', 'sale', saleId, {
    amount: Number(sale.total),
    description: `Venta #${saleId} eliminada — ${reason.trim()}`,
    reason: reason.trim(),
    previous_status: sale.status,
    payment_method: sale.payment_method,
    original_created_at: sale.created_at,
    items: saleItems.map((i) => ({
      product_id: i.product_id,
      qty: i.quantity,
      unit_price: i.unit_price,
    })),
    stock_restore_failures: restoreFailures,
  })

  revalidatePath('/ventas')
  revalidatePath('/ventas/historial')
  revalidatePath('/dashboard')
  revalidatePath('/productos')
  revalidatePath('/caja')
  revalidatePath('/auditoria')

  if (restoreFailures.length > 0) {
    return {
      success: false,
      error: `Venta eliminada pero falló restaurar stock para producto(s): ${restoreFailures.join(', ')}. Revisar inventario.`,
    }
  }

  return { success: true, saleId }
}
