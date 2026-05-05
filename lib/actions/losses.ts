'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const LossSchema = z.object({
  product_id: z.coerce.number().int().positive('Producto requerido'),
  quantity: z.coerce.number().int().positive('Cantidad debe ser mayor a 0'),
  reason: z.string().min(1, 'Motivo requerido'),
  cost: z.coerce.number().min(0).optional().nullable(),
})

export type LossState = {
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

export async function createLoss(
  _: LossState,
  formData: FormData
): Promise<LossState> {
  const { supabase, user } = await requireAdmin()

  const parsed = LossSchema.safeParse({
    product_id: formData.get('product_id'),
    quantity: formData.get('quantity'),
    reason: formData.get('reason'),
    cost: formData.get('cost') || null,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { error: lossError } = await supabase.from('losses').insert({
    ...parsed.data,
    created_by: user.id,
  })

  if (lossError) return { message: `Error: ${lossError.message}` }

  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', parsed.data.product_id)
    .single()

  if (!product) return { message: 'Producto no encontrado' }

  const newStock = Math.max(0, product.stock - parsed.data.quantity)
  const { error: stockError } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', parsed.data.product_id)

  if (stockError) return { message: `Error al actualizar stock: ${stockError.message}` }

  revalidatePath('/inventario')
  revalidatePath('/productos')
  revalidatePath('/dashboard')
  redirect('/inventario')
}

export async function getProductsForLosses() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('id, name, stock')
    .eq('active', true)
    .order('name')
  return data ?? []
}

export async function getLosses() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('losses')
    .select('id, quantity, reason, cost, created_at, products(name), profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)
  return data ?? []
}
