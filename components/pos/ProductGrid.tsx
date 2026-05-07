'use client'

import { useCartStore } from '@/lib/store/cart'
import { pickOne } from '@/lib/supabase/relations'
import { Plus } from 'lucide-react'

type Product = {
  id: number
  name: string
  price: number
  stock: number
  categories: { name: string } | { name: string }[] | null
}

interface ProductGridProps {
  products: Product[]
}

export default function ProductGrid({ products }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {products.map((p) => (
        <div
          key={p.id}
          onClick={() => p.stock > 0 && addItem({ id: p.id, name: p.name, price: p.price, stock: p.stock })}
          className="bg-white rounded-2xl p-4 shadow-sm transition-all select-none"
          style={{
            opacity: p.stock === 0 ? 0.5 : 1,
            cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
            border: '2px solid transparent',
          }}
          onMouseEnter={(e) => {
            if (p.stock > 0) (e.currentTarget as HTMLDivElement).style.borderColor = '#2ba5b2'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base leading-tight truncate" style={{ color: '#023e55' }}>
                {p.name}
              </p>
              {pickOne<{ name: string }>(p.categories)?.name && (
                <p className="text-sm text-gray-400 truncate mt-0.5">{pickOne<{ name: string }>(p.categories)!.name}</p>
              )}
              <p className="text-lg font-bold mt-2" style={{ color: '#2ba5b2' }}>
                ₡{Number(p.price).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#2ba5b215' }}>
                <Plus className="h-4 w-4" style={{ color: '#2ba5b2' }} />
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={
                  p.stock < 5
                    ? { backgroundColor: '#f7af0225', color: '#b07d00' }
                    : { backgroundColor: '#2ba5b215', color: '#1d7a85' }
                }
              >
                {p.stock}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
