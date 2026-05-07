import { create } from 'zustand'
import type { Promotion } from '@/lib/actions/promotions'
import { calcDiscounts, calcTotal, type AppliedDiscount } from '@/lib/promotions/calc'

export type CartItem = {
  id: number
  name: string
  price: number
  quantity: number
  stock: number
}

export type { AppliedDiscount }

type CartStore = {
  items: CartItem[]
  addItem: (product: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: number) => void
  updateQty: (id: number, quantity: number) => void
  clearCart: () => void
  total: () => number
  discountedTotal: (promotions: Promotion[]) => number
  getAppliedDiscounts: (promotions: Promotion[]) => AppliedDiscount[]
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return state
        return {
          items: state.items.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, { ...product, quantity: 1 }] }
    })
  },

  removeItem: (id) => {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
  },

  updateQty: (id, quantity) => {
    set((state) => ({
      items: quantity <= 0
        ? state.items.filter((i) => i.id !== id)
        : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    }))
  },

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  getAppliedDiscounts: (promotions) => calcDiscounts(get().items, promotions),

  discountedTotal: (promotions) => calcTotal(get().items, promotions),
}))
