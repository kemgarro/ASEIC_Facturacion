import { createProduct, getCategories } from '@/lib/actions/products'
import ProductForm from '@/components/products/ProductForm'

export default async function NuevoProductoPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nuevo producto</h1>
      <ProductForm action={createProduct} categories={categories} />
    </div>
  )
}
