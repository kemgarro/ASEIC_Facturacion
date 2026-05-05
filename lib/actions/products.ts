'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/actions/audit'

const ProductSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().positive('Precio debe ser mayor a 0'),
  stock: z.coerce.number().int().min(0, 'Stock no puede ser negativo'),
  category_id: z.coerce.number().optional().nullable(),
  active: z.boolean().default(true),
})

export type ProductState = {
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

export async function createProduct(_: ProductState, formData: FormData): Promise<ProductState> {
  const { supabase, user, userName } = await requireAdmin()

  const parsed = ProductSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    sku: formData.get('sku') || undefined,
    price: formData.get('price'),
    stock: formData.get('stock'),
    category_id: formData.get('category_id') || null,
    active: formData.get('active') === 'true',
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert(parsed.data)
    .select('id')
    .single()

  if (error || !product) return { message: `Error: ${error?.message}` }

  await logAudit(supabase, user.id, userName, 'producto_creado', 'product', product.id, {
    name: parsed.data.name,
    price: parsed.data.price,
    stock: parsed.data.stock,
    sku: parsed.data.sku,
    description: `Producto "${parsed.data.name}" creado — ₡${parsed.data.price}`,
  })

  revalidatePath('/productos')
  redirect('/productos')
}

export async function updateProduct(
  id: number,
  _: ProductState,
  formData: FormData
): Promise<ProductState> {
  const { supabase, user, userName } = await requireAdmin()

  const parsed = ProductSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    sku: formData.get('sku') || undefined,
    price: formData.get('price'),
    stock: formData.get('stock'),
    category_id: formData.get('category_id') || null,
    active: formData.get('active') === 'true',
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase
    .from('products')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { message: `Error: ${error.message}` }

  await logAudit(supabase, user.id, userName, 'producto_editado', 'product', id, {
    name: parsed.data.name,
    price: parsed.data.price,
    stock: parsed.data.stock,
    description: `Producto "${parsed.data.name}" editado — ₡${parsed.data.price}, stock ${parsed.data.stock}`,
  })

  revalidatePath('/productos')
  redirect('/productos')
}

export async function getCategories() {
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('id, name').order('name')
  return data ?? []
}
