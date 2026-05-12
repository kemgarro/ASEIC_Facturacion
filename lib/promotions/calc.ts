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

function getCompletionPosition(promo: Promotion, items: CalcItem[]): number | null {
  const promoIds = promo.promotion_products.map((p) => p.product_id)

  if (promo.type === 'combo') {
    const positions = promoIds.map((pid) => items.findIndex((i) => i.id === pid))
    if (positions.some((p) => p < 0)) return null
    for (const pid of promoIds) {
      const it = items.find((i) => i.id === pid)
      if (!it || it.quantity < 1) return null
    }
    return Math.max(...positions)
  }

  if (promo.type === '2x1' || promo.type === 'NxM' || promo.type === 'bundle') {
    const required = promo.type === '2x1' ? 2 : (promo.buy_qty ?? 0)
    if (required <= 0) return null
    let earliest: number | null = null
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx]
      if (!promoIds.includes(it.id)) continue
      if (it.quantity >= required && (earliest === null || idx < earliest)) earliest = idx
    }
    return earliest
  }

  if (promo.type === 'pct_discount' || promo.type === 'fixed_discount') {
    let earliest: number | null = null
    for (let idx = 0; idx < items.length; idx++) {
      if (promoIds.includes(items[idx].id) && (earliest === null || idx < earliest)) earliest = idx
    }
    return earliest
  }

  return null
}

export function calcDiscounts(items: CalcItem[], promotions: Promotion[]): AppliedDiscount[] {
  const discounts: AppliedDiscount[] = []
  const remaining = new Map<number, number>()
  for (const item of items) remaining.set(item.id, item.quantity)
  const itemMap = new Map(items.map((i) => [i.id, i]))

  const ranked = promotions
    .map((promo) => ({ promo, position: getCompletionPosition(promo, items) }))
    .filter((r): r is { promo: Promotion; position: number } => r.position !== null)
    .sort((a, b) => a.position - b.position || a.promo.id - b.promo.id)

  for (const { promo } of ranked) {
    const promoProductIds = promo.promotion_products.map((p) => p.product_id)

    if (promo.type === 'pct_discount' && promo.value) {
      for (const pid of promoProductIds) {
        const item = itemMap.get(pid)
        const avail = remaining.get(pid) ?? 0
        if (!item || avail <= 0) continue
        const amount = item.price * avail * (promo.value / 100)
        if (amount > 0) {
          discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
          remaining.set(pid, 0)
        }
      }
    }

    if (promo.type === 'fixed_discount' && promo.value) {
      for (const pid of promoProductIds) {
        const item = itemMap.get(pid)
        const avail = remaining.get(pid) ?? 0
        if (!item || avail <= 0) continue
        const amount = Math.min(promo.value * avail, item.price * avail)
        if (amount > 0) {
          discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
          remaining.set(pid, 0)
        }
      }
    }

    if (promo.type === '2x1') {
      for (const pid of promoProductIds) {
        const item = itemMap.get(pid)
        const avail = remaining.get(pid) ?? 0
        if (!item) continue
        const freePairs = Math.floor(avail / 2)
        if (freePairs <= 0) continue
        const amount = freePairs * item.price
        discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
        remaining.set(pid, avail - freePairs * 2)
      }
    }

    if (promo.type === 'NxM' && promo.buy_qty && promo.pay_qty) {
      for (const pid of promoProductIds) {
        const item = itemMap.get(pid)
        const avail = remaining.get(pid) ?? 0
        if (!item) continue
        const groups = Math.floor(avail / promo.buy_qty)
        if (groups <= 0) continue
        const freeUnits = groups * (promo.buy_qty - promo.pay_qty)
        const amount = freeUnits * item.price
        if (amount > 0) {
          discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
          remaining.set(pid, avail - groups * promo.buy_qty)
        }
      }
    }

    if (promo.type === 'bundle' && promo.buy_qty && promo.combo_price) {
      for (const pid of promoProductIds) {
        const item = itemMap.get(pid)
        const avail = remaining.get(pid) ?? 0
        if (!item) continue
        const bundles = Math.floor(avail / promo.buy_qty)
        if (bundles <= 0) continue
        const savingsPerBundle = promo.buy_qty * item.price - promo.combo_price
        if (savingsPerBundle <= 0) continue
        const amount = savingsPerBundle * bundles
        discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
        remaining.set(pid, avail - bundles * promo.buy_qty)
      }
    }

    if (promo.type === 'combo' && promo.combo_price) {
      const bundles = Math.min(...promoProductIds.map((pid) => remaining.get(pid) ?? 0))
      if (bundles <= 0) continue
      const normalPerBundle = promoProductIds.reduce((sum, pid) => {
        const item = itemMap.get(pid)
        return sum + (item ? item.price : 0)
      }, 0)
      const savingsPerBundle = normalPerBundle - promo.combo_price
      if (savingsPerBundle <= 0) continue
      const amount = savingsPerBundle * bundles
      discounts.push({ promotionId: promo.id, promotionName: promo.name, amount })
      for (const pid of promoProductIds) {
        remaining.set(pid, (remaining.get(pid) ?? 0) - bundles)
      }
    }
  }

  return discounts
}

export function calcTotal(items: CalcItem[], promotions: Promotion[]): number {
  const raw = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const discount = calcDiscounts(items, promotions).reduce((s, d) => s + d.amount, 0)
  return Math.max(0, raw - discount)
}
