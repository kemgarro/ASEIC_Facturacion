'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type CartItem } from '@/lib/store/cart'

export type SaleResult = { success: true; saleId: number } | { success: false; error: string }

export async function createSale(
  items: CartItem[],
  customerId?: number | null
): Promise<SaleResult> {
  if (items.length === 0) return { success: false, error: 'Carrito vacío' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

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

  // Descontar stock uno por uno (sin RPC por ahora)
  for (const item of items) {
    await supabase
      .from('products')
      .update({ stock: item.stock - item.quantity })
      .eq('id', item.id)
  }

  revalidatePath('/ventas')
  revalidatePath('/ventas/historial')
  revalidatePath('/dashboard')
  revalidatePath('/productos')

  return { success: true, saleId: sale.id }
}
