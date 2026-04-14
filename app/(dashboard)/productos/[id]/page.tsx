import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateProduct, getCategories } from '@/lib/actions/products'
import ProductForm from '@/components/products/ProductForm'

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, categories] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, sku, price, stock, category_id, active')
      .eq('id', id)
      .single(),
    getCategories(),
  ])

  if (!product) notFound()

  const updateWithId = updateProduct.bind(null, product.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>
      <ProductForm action={updateWithId} categories={categories} product={product} />
    </div>
  )
}
