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

  // Decremento de stock con guard atómico: update filtrado por id + stock>=qty.
  // Si afecta 0 filas, no había stock suficiente. Para concurrencia ideal conviene
  // mover esto a una RPC Postgres con SELECT FOR UPDATE.
  const decremented: { id: number; quantity: number }[] = []
  for (const item of items) {
    const { data: prod, error: readErr } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.id)
      .single()

    if (readErr || !prod) {
      await rollbackSale(supabase, sale.id, decremented)
      return { success: false, error: `Producto no encontrado: ${item.name}` }
    }

    const { data: applied, error: applyErr } = await supabase
      .from('products')
      .update({ stock: prod.stock - item.quantity })
      .eq('id', item.id)
      .gte('stock', item.quantity)
      .select('id')

    if (applyErr) {
      await rollbackSale(supabase, sale.id, decremented)
      return { success: false, error: `Error al actualizar stock: ${applyErr.message}` }
    }
    if (!applied || applied.length === 0) {
      await rollbackSale(supabase, sale.id, decremented)
      return { success: false, error: `Stock insuficiente para: ${item.name}` }
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
  // Restauramos stock decrementado antes de eliminar la venta huérfana.
  for (const d of decremented) {
    const { data: prod } = await supabase.from('products').select('stock').eq('id', d.id).single()
    if (prod) {
      const { error } = await supabase
        .from('products')
        .update({ stock: prod.stock + d.quantity })
        .eq('id', d.id)
      if (error) console.error('[rollback] failed to restore stock', { saleId, productId: d.id, error: error.message })
    }
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
    const { data: product, error: readErr } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (readErr || !product) {
      restoreFailures.push(item.product_id)
      continue
    }

    const { error: updErr } = await supabase
      .from('products')
      .update({ stock: product.stock + item.quantity })
      .eq('id', item.product_id)

    if (updErr) restoreFailures.push(item.product_id)
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
