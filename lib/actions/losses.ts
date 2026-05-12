'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/actions/audit'
import { attachProfiles } from '@/lib/supabase/relations'

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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Acceso denegado')
  return { supabase, user, userName: profile.full_name ?? user.email ?? user.id }
}

export async function createLoss(
  _: LossState,
  formData: FormData
): Promise<LossState> {
  const { supabase, user, userName } = await requireAdmin()

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

  const { data: newStock, error: stockError } = await supabase.rpc('decrement_stock_clamped', {
    p_product_id: parsed.data.product_id,
    p_qty: parsed.data.quantity,
  })

  if (stockError) return { message: `Error al actualizar stock: ${stockError.message}` }
  if (newStock === null) return { message: 'Producto no encontrado' }

  const { data: productData } = await supabase
    .from('products').select('name').eq('id', parsed.data.product_id).single()

  await logAudit(supabase, user.id, userName, 'perdida_registrada', 'loss', parsed.data.product_id, {
    product_name: productData?.name ?? 'desconocido',
    quantity: parsed.data.quantity,
    reason: parsed.data.reason,
    cost: parsed.data.cost,
    description: `Pérdida de ${parsed.data.quantity} × ${productData?.name ?? 'producto'} — ${parsed.data.reason}`,
  })

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
  const { data, error } = await supabase
    .from('losses')
    .select('id, quantity, reason, cost, created_at, created_by, products(name)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    console.error('[losses] getLosses failed', error.message)
    return []
  }
  return attachProfiles(supabase, data ?? [], 'created_by')
}
