'use client'

import { useCartStore } from '@/lib/store/cart'
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react'
import CheckoutModal from './CheckoutModal'
import type { Promotion } from '@/lib/actions/promotions'

interface CartProps {
  promotions?: Promotion[]
}

export default function Cart({ promotions = [] }: CartProps) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQty = useCartStore((s) => s.updateQty)
  const total = useCartStore((s) => s.total)
  const getAppliedDiscounts = useCartStore((s) => s.getAppliedDiscounts)
  const discountedTotal = useCartStore((s) => s.discountedTotal)
  const discounts = getAppliedDiscounts(promotions)
  const finalTotal = discountedTotal(promotions)
  const rawTotal = total()

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#023e55' }}>Carrito</h2>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <ShoppingBag className="h-12 w-12 opacity-30" />
          <p className="text-base text-center">Agrega productos<br />haciendo clic</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4" style={{ color: '#023e55' }}>Carrito</h2>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl p-3" style={{ backgroundColor: '#eef4f6' }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-semibold leading-tight flex-1" style={{ color: '#023e55' }}>
                {item.name}
              </p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'white', border: '1px solid #ddd' }}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-base font-semibold w-8 text-center" style={{ color: '#3b4e73' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                  className="h-7 w-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                  style={{ backgroundColor: 'white', border: '1px solid #ddd' }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <p className="text-base font-bold" style={{ color: '#2ba5b2' }}>
                ₡{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: '2px solid #eef4f6' }}>
        {discounts.length > 0 && (
          <div className="mb-3 space-y-1">
            {discounts.map((d) => (
              <div key={d.promotionId} className="flex justify-between text-sm">
                <span className="text-green-700 font-medium truncate flex-1 mr-2">🏷 {d.promotionName}</span>
                <span className="text-green-700 font-semibold shrink-0">-₡{d.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm text-gray-400 pt-1" style={{ borderTop: '1px solid #eef4f6' }}>
              <span>Subtotal</span>
              <span>₡{rawTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold" style={{ color: '#3b4e73' }}>Total</span>
          <span className="text-2xl font-bold" style={{ color: '#023e55' }}>₡{finalTotal.toFixed(2)}</span>
        </div>
        <CheckoutModal promotions={promotions} />
      </div>
    </div>
  )
}
