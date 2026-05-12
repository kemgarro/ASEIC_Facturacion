'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/actions/audit'
import { attachProfiles } from '@/lib/supabase/relations'

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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Acceso denegado')
  return { supabase, user, userName: profile.full_name ?? user.email ?? user.id }
}

export async function createInventoryEntry(
  _: InventoryEntryState,
  formData: FormData
): Promise<InventoryEntryState> {
  const { supabase, user, userName } = await requireAdmin()

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

  const { data: newStock, error: stockError } = await supabase.rpc('increment_stock', {
    p_product_id: parsed.data.product_id,
    p_qty: parsed.data.quantity,
  })

  if (stockError) return { message: `Error al actualizar stock: ${stockError.message}` }
  if (newStock === null) return { message: 'Producto no encontrado' }

  const { data: productData } = await supabase
    .from('products').select('name').eq('id', parsed.data.product_id).single()

  await logAudit(supabase, user.id, userName, 'inventario_entrada', 'inventory_entry', parsed.data.product_id, {
    product_name: productData?.name ?? 'desconocido',
    quantity: parsed.data.quantity,
    cost: parsed.data.cost,
    supplier: parsed.data.supplier,
    description: `Entrada de ${parsed.data.quantity} × ${productData?.name ?? 'producto'}${parsed.data.supplier ? ` (${parsed.data.supplier})` : ''}`,
  })

  revalidatePath('/inventario')
  revalidatePath('/productos')
  revalidatePath('/dashboard')
  redirect('/inventario')
}

export async function getInventoryEntries() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_entries')
    .select('id, quantity, cost, supplier, notes, created_at, created_by, products(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    console.error('[inventory] getInventoryEntries failed', error.message)
    return []
  }
  return attachProfiles(supabase, data ?? [], 'created_by')
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
