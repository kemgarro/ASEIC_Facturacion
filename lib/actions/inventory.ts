'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const EntrySchema = z.object({
  product_id: z.coerce.number().int().positive('Producto requerido'),
  quantity: z.coerce.number().int().positive('Cantidad debe ser mayor a 0'),
  cost: z.coerce.number().min(0).optional().nullable(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
})

export type InventoryEntryState = {
  errors?: Record<string, string[]>
  message?: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Acceso denegado')
  return { supabase, user }
}

export async function createInventoryEntry(
  _: InventoryEntryState,
  formData: FormData
): Promise<InventoryEntryState> {
  const { supabase, user } = await requireAdmin()

  const parsed = EntrySchema.safeParse({
    product_id: formData.get('product_id'),
    quantity: formData.get('quantity'),
    cost: formData.get('cost') || null,
    supplier: formData.get('supplier') || undefined,
    notes: formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { error: entryError } = await supabase.from('inventory_entries').insert({
    ...parsed.data,
    created_by: user.id,
  })

  if (entryError) return { message: `Error: ${entryError.message}` }

  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', parsed.data.product_id)
    .single()

  if (!product) return { message: 'Producto no encontrado' }

  const { error: stockError } = await supabase
    .from('products')
    .update({ stock: product.stock + parsed.data.quantity })
    .eq('id', parsed.data.product_id)

  if (stockError) return { message: `Error al actualizar stock: ${stockError.message}` }

  revalidatePath('/inventario')
  revalidatePath('/productos')
  revalidatePath('/dashboard')
  redirect('/inventario')
}

export async function getInventoryEntries() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inventory_entries')
    .select('id, quantity, cost, supplier, notes, created_at, products(name), profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
}

export async function getProductsForInventory() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, stock')
    .eq('active', true)
    .order('name')
  return data ?? []
}
