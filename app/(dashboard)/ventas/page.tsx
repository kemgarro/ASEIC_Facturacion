import { createClient } from '@/lib/supabase/server'
import { getActivePromotions } from '@/lib/actions/promotions'
import ProductGrid from '@/components/pos/ProductGrid'
import Cart from '@/components/pos/Cart'
import type { Promotion } from '@/lib/actions/promotions'

type ProductRow = {
  id: number
  name: string
  price: number
  stock: number
  categories: { name: string }[] | null
}

export default async function VentasPage() {
  const supabase = await createClient()

  const [{ data: products }, promotions] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, stock, categories(name)')
      .eq('active', true)
      .order('name'),
    getActivePromotions(),
  ])

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      <div className="flex-1 min-w-0 overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-5" style={{ color: '#023e55' }}>Nueva Venta</h1>
        <ProductGrid products={(products ?? []) as ProductRow[]} />
      </div>

      <div
        className="rounded-2xl shadow-sm p-5 flex flex-col border-t-4 w-full lg:w-80 lg:shrink-0"
        style={{ backgroundColor: 'white', borderTopColor: '#2ba5b2' }}
      >
        <Cart promotions={promotions as Promotion[]} />
      </div>
    </div>
  )
}
