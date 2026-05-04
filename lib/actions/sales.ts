'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type CartItem } from '@/lib/store/cart'

export type SaleResult = { success: true; saleId: number } | { success: false; error: string }

export async function createSale(
  items: CartItem[],
  customerId?: number | null,
  overrideTotal?: number
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

  // Validar stock disponible antes de descontar
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

  // Descontar stock en lote
  const stockUpdates = items.map(item => ({
    id: item.id,
    stock: item.stock - item.quantity
  }))

  for (const update of stockUpdates) {
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: update.stock })
      .eq('id', update.id)

    if (stockError) return { success: false, error: `Error al atualizar stock: ${stockError.message}` }
  }

  revalidatePath('/ventas')
  revalidatePath('/ventas/historial')
  revalidatePath('/dashboard')
  revalidatePath('/productos')

  return { success: true, saleId: sale.id }
}
