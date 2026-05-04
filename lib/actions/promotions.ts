'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type PromotionType = 'pct_discount' | 'fixed_discount' | '2x1' | 'NxM' | 'combo'

export type Promotion = {
  id: number
  name: string
  type: PromotionType
  value: number | null
  buy_qty: number | null
  pay_qty: number | null
  combo_price: number | null
  active: boolean
  starts_at: string | null
  ends_at: string | null
  promotion_products: { product_id: number }[]
}

export type PromotionState = {
  errors?: Record<string, string[]>
  message?: string
}

const PromotionSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.enum(['pct_discount', 'fixed_discount', '2x1', 'NxM', 'combo']),
  value: z.coerce.number().optional().nullable(),
  buy_qty: z.coerce.number().int().optional().nullable(),
  pay_qty: z.coerce.number().int().optional().nullable(),
  combo_price: z.coerce.number().optional().nullable(),
  active: z.boolean().default(true),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  product_ids: z.array(z.coerce.number().int()).min(1, 'Selecciona al menos un producto'),
})

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

function parseFormData(formData: FormData) {
  const productIds = formData.getAll('product_ids').map(Number).filter(Boolean)
  return {
    name: formData.get('name'),
    type: formData.get('type'),
    value: formData.get('value') || null,
    buy_qty: formData.get('buy_qty') || null,
    pay_qty: formData.get('pay_qty') || null,
    combo_price: formData.get('combo_price') || null,
    active: formData.get('active') === 'true',
    starts_at: formData.get('starts_at') || null,
    ends_at: formData.get('ends_at') || null,
    product_ids: productIds,
  }
}

export async function createPromotion(
  _: PromotionState,
  formData: FormData
): Promise<PromotionState> {
  const { supabase } = await requireAdmin()

  const parsed = PromotionSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { product_ids, ...promoData } = parsed.data

  const { data: promo, error: promoError } = await supabase
    .from('promotions')
    .insert(promoData)
    .select('id')
    .single()

  if (promoError || !promo) return { message: `Error: ${promoError?.message}` }

  const links = product_ids.map((pid) => ({ promotion_id: promo.id, product_id: pid }))
  const { error: linkError } = await supabase.from('promotion_products').insert(links)
  if (linkError) return { message: `Error al vincular productos: ${linkError.message}` }

  revalidatePath('/promociones')
  revalidatePath('/ventas')
  redirect('/promociones')
}

export async function updatePromotion(
  id: number,
  _: PromotionState,
  formData: FormData
): Promise<PromotionState> {
  const { supabase } = await requireAdmin()

  const parsed = PromotionSchema.safeParse(parseFormData(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { product_ids, ...promoData } = parsed.data

  const { error: promoError } = await supabase
    .from('promotions')
    .update(promoData)
    .eq('id', id)

  if (promoError) return { message: `Error: ${promoError.message}` }

  await supabase.from('promotion_products').delete().eq('promotion_id', id)
  const links = product_ids.map((pid) => ({ promotion_id: id, product_id: pid }))
  const { error: linkError } = await supabase.from('promotion_products').insert(links)
  if (linkError) return { message: `Error al vincular productos: ${linkError.message}` }

  revalidatePath('/promociones')
  revalidatePath('/ventas')
  redirect('/promociones')
}

export async function getPromotions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('promotions')
    .select('*, promotion_products(product_id, products(name))')
    .order('created_at', { ascending: false })
  return (data ?? []) as (Promotion & { promotion_products: { product_id: number; products: { name: string } }[] })[]
}

export async function getPromotionById(id: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('promotions')
    .select('*, promotion_products(product_id)')
    .eq('id', id)
    .single()
  return data as Promotion | null
}

export async function getActivePromotions(): Promise<Promotion[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('promotions')
    .select('*, promotion_products(product_id)')
    .eq('active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
  return (data ?? []) as Promotion[]
}
