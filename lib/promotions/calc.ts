import type { Promotion } from '@/lib/actions/promotions'

export type CalcItem = {
  id: number
  name: string
  price: number
  quantity: number
}

export type AppliedDiscount = {
  promotionId: number
  promotionName: string
  amount: number
}

export function calcDiscounts(items: CalcItem[], promotions: Promotion[]): AppliedDiscount[] {
  const discounts: AppliedDiscount[] = []

  for (const promo of promotions) {
    const promoProductIds = promo.promotion_products.map((p) => p.product_id)

    if (promo.type === 'pct_discount' && promo.value) {
      for (const item of items) {
        if (!promoProductIds.includes(item.id)) continue
        const amount = item.price * item.quantity * (promo.value / 100)
        if (amount > 0) discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
      }
    }

    if (promo.type === 'fixed_discount' && promo.value) {
      for (const item of items) {
        if (!promoProductIds.includes(item.id)) continue
        const amount = Math.min(promo.value * item.quantity, item.price * item.quantity)
        if (amount > 0) discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
      }
    }

    if (promo.type === '2x1') {
      for (const item of items) {
        if (!promoProductIds.includes(item.id)) continue
        const freePairs = Math.floor(item.quantity / 2)
        const amount = freePairs * item.price
        if (amount > 0) discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
      }
    }

    if (promo.type === 'NxM' && promo.buy_qty && promo.pay_qty) {
      for (const item of items) {
        if (!promoProductIds.includes(item.id)) continue
        const groups = Math.floor(item.quantity / promo.buy_qty)
        const freeUnits = groups * (promo.buy_qty - promo.pay_qty)
        const amount = freeUnits * item.price
        if (amount > 0) discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
      }
    }

    if (promo.type === 'combo' && promo.combo_price) {
      const allInCart = promoProductIds.every((pid) => items.some((i) => i.id === pid))
      if (!allInCart) continue
      const normalTotal = promoProductIds.reduce((sum, pid) => {
        const item = items.find((i) => i.id === pid)
        return sum + (item ? item.price * item.quantity : 0)
      }, 0)
      const amount = normalTotal - promo.combo_price
      if (amount > 0) discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
    }
  }

  return discounts
}

export function calcTotal(items: CalcItem[], promotions: Promotion[]): number {
  const raw = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const discount = calcDiscounts(items, promotions).reduce((s, d) => s + d.amount, 0)
  return Math.max(0, raw - discount)
}
