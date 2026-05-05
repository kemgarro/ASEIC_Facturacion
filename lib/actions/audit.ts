'use server'

import { createClient } from '@/lib/supabase/server'

export type AuditEntry = {
  id: string
  type: 'venta' | 'inventario' | 'perdida' | 'caja' | 'anulacion'
  description: string
  amount: number | null
  user_name: string
  created_at: string
}

export async function getAuditLog(filters?: {
  dateFrom?: string
  dateTo?: string
  type?: string
}): Promise<AuditEntry[]> {
  const supabase = await createClient()

  const dateFrom = filters?.dateFrom ? `${filters.dateFrom}T00:00:00` : undefined
  const dateTo = filters?.dateTo ? `${filters.dateTo}T23:59:59` : undefined

  const results: AuditEntry[] = []

  // Ventas
  if (!filters?.type || filters.type === 'venta' || filters.type === 'anulacion') {
    let q = supabase
      .from('sales')
      .select('id, total, status, cancellation_reason, created_at, profiles!sales_seller_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo)

    const { data } = await q
    for (const s of data ?? []) {
      const isCancelled = s.status === 'cancelled'
      if (filters?.type === 'anulacion' && !isCancelled) continue
      if (filters?.type === 'venta' && isCancelled) continue

      const profileArr = (s.profiles as unknown) as { full_name: string }[] | null
      results.push({
        id: `sale-${s.id}`,
        type: isCancelled ? 'anulacion' : 'venta',
        description: isCancelled
          ? `Venta #${s.id} anulada — ${s.cancellation_reason ?? 'sin motivo'}`
          : `Venta #${s.id} por ₡${Number(s.total).toLocaleString('es-CR')}`,
        amount: Number(s.total),
        user_name: profileArr?.[0]?.full_name ?? '—',
        created_at: s.created_at,
      })
    }
  }

  // Inventario
  if (!filters?.type || filters.type === 'inventario') {
    let q = supabase
      .from('inventory_entries')
      .select('id, quantity, cost, products(name), profiles(full_name), created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo)

    const { data } = await q
    for (const e of data ?? []) {
      const productArr = (e.products as unknown) as { name: string }[] | null
      const profileArr = (e.profiles as unknown) as { full_name: string }[] | null
      results.push({
        id: `inv-${e.id}`,
        type: 'inventario',
        description: `Entrada de ${e.quantity} × ${productArr?.[0]?.name ?? 'producto'}`,
        amount: e.cost ? Number(e.cost) * e.quantity : null,
        user_name: profileArr?.[0]?.full_name ?? '—',
        created_at: e.created_at,
      })
    }
  }

  // Pérdidas
  if (!filters?.type || filters.type === 'perdida') {
    let q = supabase
      .from('losses')
      .select('id, quantity, cost, reason, products(name), profiles(full_name), created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo)

    const { data } = await q
    for (const l of data ?? []) {
      const productArr = (l.products as unknown) as { name: string }[] | null
      const profileArr = (l.profiles as unknown) as { full_name: string }[] | null
      results.push({
        id: `loss-${l.id}`,
        type: 'perdida',
        description: `Pérdida de ${l.quantity} × ${productArr?.[0]?.name ?? 'producto'} — ${l.reason}`,
        amount: l.cost ? Number(l.cost) * l.quantity : null,
        user_name: profileArr?.[0]?.full_name ?? '—',
        created_at: l.created_at,
      })
    }
  }

  // Caja
  if (!filters?.type || filters.type === 'caja') {
    let q = supabase
      .from('cash_movements')
      .select('id, type, amount, description, profiles(full_name), created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (dateFrom) q = q.gte('created_at', dateFrom)
    if (dateTo) q = q.lte('created_at', dateTo)

    const { data } = await q
    for (const c of data ?? []) {
      const profileArr = (c.profiles as unknown) as { full_name: string }[] | null
      results.push({
        id: `cash-${c.id}`,
        type: 'caja',
        description: `${c.type === 'ingreso' ? 'Ingreso' : 'Egreso'} de caja — ${c.description}`,
        amount: Number(c.amount),
        user_name: profileArr?.[0]?.full_name ?? '—',
        created_at: c.created_at,
      })
    }
  }

  return results.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
