import { createClient } from '@/lib/supabase/server'
import ProductGrid from '@/components/pos/ProductGrid'
import Cart from '@/components/pos/Cart'

type ProductRow = {
  id: number
  name: string
  price: number
  stock: number
  categories: { name: string }[] | null
}

export default async function VentasPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock, categories(name)')
    .eq('active', true)
    .order('name')

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-5" style={{ color: '#023e55' }}>Nueva Venta</h1>
        <ProductGrid products={(products ?? []) as ProductRow[]} />
      </div>

      <div
        className="rounded-2xl shadow-sm p-5 flex flex-col border-t-4"
        style={{ backgroundColor: 'white', borderTopColor: '#2ba5b2', minWidth: '320px', width: '340px' }}
      >
        <Cart />
      </div>
    </div>
  )
}
