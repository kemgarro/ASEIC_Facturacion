'use server'

import { createClient } from '@/lib/supabase/server'
import { pickOne } from '@/lib/supabase/relations'

export type SalesReport = {
  totalSales: number
  totalRevenue: number
  totalItems: number
  avgTicket: number
  topProducts: { name: string; qty: number; revenue: number }[]
  byDay: { date: string; sales: number; revenue: number }[]
}

export type StockReport = {
  products: { id: number; name: string; stock: number; price: number; value: number }[]
  totalValue: number
  lowStock: number
}

export async function getSalesReport(dateFrom: string, dateTo: string): Promise<SalesReport> {
  const supabase = await createClient()

  const { data: sales } = await supabase
    .from('sales')
    .select('id, total, created_at')
    .eq('status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .order('created_at', { ascending: true })

  const saleIds = (sales ?? []).map((s) => s.id)

  const { data: items } = saleIds.length > 0
    ? await supabase
        .from('sale_items')
        .select('quantity, unit_price, subtotal, products(name), sale_id')
        .in('sale_id', saleIds)
    : { data: [] }

  const totalRevenue = (sales ?? []).reduce((sum, s) => sum + Number(s.total), 0)
  const totalItems = (items ?? []).reduce((sum, i) => sum + i.quantity, 0)

  const productMap: Record<string, { qty: number; revenue: number }> = {}
  for (const item of items ?? []) {
    const name = pickOne<{ name: string }>(item.products as unknown as { name: string } | { name: string }[] | null)?.name ?? 'Desconocido'
    if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 }
    productMap[name].qty += item.quantity
    productMap[name].revenue += Number(item.subtotal)
  }
  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const dayMap: Record<string, { sales: number; revenue: number }> = {}
  for (const sale of sales ?? []) {
    const day = sale.created_at.split('T')[0]
    if (!dayMap[day]) dayMap[day] = { sales: 0, revenue: 0 }
    dayMap[day].sales += 1
    dayMap[day].revenue += Number(sale.total)
  }
  const byDay = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }))

  return {
    totalSales: (sales ?? []).length,
    totalRevenue,
    totalItems,
    avgTicket: (sales ?? []).length > 0 ? totalRevenue / (sales ?? []).length : 0,
    topProducts,
    byDay,
  }
}

export async function getStockReport(): Promise<StockReport> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('id, name, stock, price')
    .eq('active', true)
    .order('stock', { ascending: true })

  const products = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stock: p.stock,
    price: Number(p.price),
    value: p.stock * Number(p.price),
  }))

  return {
    products,
    totalValue: products.reduce((sum, p) => sum + p.value, 0),
    lowStock: products.filter((p) => p.stock < 5).length,
  }
}

