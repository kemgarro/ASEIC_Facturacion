'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type CartItem } from '@/lib/store/cart'
import { logAudit } from '@/lib/actions/audit'

export type PaymentMethod = 'efectivo' | 'sinpe' | 'mixto'

export interface PaymentInfo {
  method: PaymentMethod
  cashAmount?: number
  sinpeAmount?: number
  referenceCode?: string
}

export type SaleResult = { success: true; saleId: number } | { success: false; error: string }

export async function createSale(
  items: CartItem[],
  customerId?: number | null,
  overrideTotal?: number,
  payment?: PaymentInfo
): Promise<SaleResult> {
  if (items.length === 0) return { success: false, error: 'Carrito vacío' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return { success: false, error: 'Perfil no encontrado' }

  const total = overrideTotal ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0)

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

  const saleItems = items.map((i) => ({
    sale_id: sale.id,
    product_id: i.id,
    quantity: i.quantity,
    unit_price: i.price,
    subtotal: i.price * i.quantity,
  }))

  const { error: itemsError } = await supabase.from('sale_items').insert(saleItems)
  if (itemsError) return { success: false, error: itemsError.message }

  const productIds = items.map(i => i.id)
  const { data: products } = await supabase
    .from('products')
    .select('id, stock')
    .in('id', productIds)

  if (!products) return { success: false, error: 'Error al verificar stock' }

  for (const item of items) {
    const product = products.find(p => p.id === item.id)
    if (!product || product.stock < item.quantity) {
      return { success: false, error: `Stock insuficiente para: ${item.name}` }
    }
  }

  for (const item of items) {
    const product = products.find(p => p.id === item.id)!
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: product.stock - item.quantity })
      .eq('id', item.id)

    if (stockError) return { success: false, error: `Error al actualizar stock: ${stockError.message}` }
  }

  const paymentDesc = payment?.method === 'sinpe'
    ? `Venta #${sale.id} — SINPE${payment.referenceCode ? ` (ref: ${payment.referenceCode})` : ''}`
    : payment?.method === 'mixto'
    ? `Venta #${sale.id} — Mixto (₡${payment.cashAmount ?? 0} efectivo + ₡${payment.sinpeAmount ?? 0} SINPE)`
    : `Venta #${sale.id} — Efectivo`

  const { data: sellerProfile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single()
  const sellerName = sellerProfile?.full_name ?? user.email ?? user.id

  await supabase.from('cash_movements').insert({
    type: 'ingreso',
    amount: total.toFixed(2),
    description: paymentDesc,
    category: 'venta',
    reference_id: sale.id,
    created_by: user.id,
  })

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

export async function cancelSale(saleId: number, reason: string): Promise<SaleResult> {
  if (!reason.trim()) return { success: false, error: 'Motivo requerido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { success: false, error: 'Solo administradores pueden anular ventas' }

  const { data: sale } = await supabase
    .from('sales')
    .select('id, status, sale_items(product_id, quantity)')
    .eq('id', saleId)
    .single()

  if (!sale) return { success: false, error: 'Venta no encontrada' }
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
  for (const item of saleItems) {
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (product) {
      await supabase
        .from('products')
        .update({ stock: product.stock + item.quantity })
        .eq('id', item.product_id)
    }
  }

  const { data: saleData } = await supabase
    .from('sales')
    .select('total')
    .eq('id', saleId)
    .single()

  const { data: adminProfile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single()
  const adminName = adminProfile?.full_name ?? user.email ?? user.id

  if (saleData) {
    await supabase.from('cash_movements').insert({
      type: 'egreso',
      amount: saleData.total,
      description: `Anulación venta #${saleId} — ${reason.trim()}`,
      category: 'anulacion',
      reference_id: saleId,
      created_by: user.id,
    })

    await logAudit(supabase, user.id, adminName, 'venta_anulada', 'sale', saleId, {
      amount: Number(saleData.total),
      description: `Venta #${saleId} anulada — ${reason.trim()}`,
      reason: reason.trim(),
    })
  }

  revalidatePath('/ventas/historial')
  revalidatePath('/dashboard')
  revalidatePath('/productos')

  return { success: true, saleId }
}
