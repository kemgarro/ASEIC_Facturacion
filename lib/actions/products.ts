'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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

export async function createProduct(_: ProductState, formData: FormData): Promise<ProductState> {
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

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert(parsed.data)

  if (error) return { message: `Error: ${error.message}` }

  revalidatePath('/productos')
  redirect('/productos')
}

export async function updateProduct(
  id: number,
  _: ProductState,
  formData: FormData
): Promise<ProductState> {
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

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { message: `Error: ${error.message}` }

  revalidatePath('/productos')
  redirect('/productos')
}

export async function getCategories() {
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('id, name').order('name')
  return data ?? []
}
