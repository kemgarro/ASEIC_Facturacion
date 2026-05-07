'use server'

import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction =
  | 'venta_creada' | 'venta_anulada'
  | 'producto_creado' | 'producto_editado'
  | 'inventario_entrada'
  | 'perdida_registrada'
  | 'caja_movimiento'
  | 'promocion_creada' | 'promocion_editada'

export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  userName: string,
  action: AuditAction,
  entity: string,
  entityId: string | number,
  details: Record<string, unknown>
) {
  const { error } = await supabase.from('audit_log').insert({
    user_id: userId,
    user_name: userName,
    action,
    entity,
    entity_id: String(entityId),
    details,
  })
  if (error) {
    console.error('[audit] insert failed', { action, entity, entityId, error: error.message })
  }
}

export type AuditEntry = {
  id: string
  type: string
  description: string
  amount: number | null
  user_name: string
  created_at: string
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  venta_creada: 'Venta',
  venta_anulada: 'Anulación',
  producto_creado: 'Producto creado',
  producto_editado: 'Producto editado',
  inventario_entrada: 'Entrada inventario',
  perdida_registrada: 'Pérdida',
  caja_movimiento: 'Caja',
  promocion_creada: 'Promoción creada',
  promocion_editada: 'Promoción editada',
}

export async function getAuditLog(filters?: {
  dateFrom?: string
  dateTo?: string
  type?: string
}): Promise<AuditEntry[]> {
  const supabase = await createClient()

  let q = supabase
    .from('audit_log')
    .select('id, action, entity, entity_id, details, user_name, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters?.dateFrom) q = q.gte('created_at', `${filters.dateFrom}T00:00:00`)
  if (filters?.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`)
  if (filters?.type) q = q.eq('action', filters.type)

  const { data } = await q

  return (data ?? []).map((row) => {
    const details = (row.details ?? {}) as Record<string, unknown>
    const amount = typeof details.amount === 'number' ? details.amount
      : typeof details.amount === 'string' ? Number(details.amount)
      : null

    const label = ACTION_DESCRIPTIONS[row.action] ?? row.action
    const entityDetail = details.description
      ? String(details.description)
      : details.name
      ? String(details.name)
      : `${row.entity} #${row.entity_id}`

    return {
      id: String(row.id),
      type: row.action,
      description: `${label} — ${entityDetail}`,
      amount,
      user_name: row.user_name,
      created_at: row.created_at,
    }
  })
}
