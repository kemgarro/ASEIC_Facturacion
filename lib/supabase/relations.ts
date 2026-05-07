import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Normaliza el resultado de una relación one-to-one de Supabase a un único objeto.
 * Supabase puede devolverla como objeto o como array según la inferencia de FK; este
 * helper acepta ambos shapes y siempre retorna el primer registro o null.
 */
export function pickOne<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null
  if (Array.isArray(rel)) return rel[0] ?? null
  return rel
}

/**
 * Attachea profiles a una lista de filas que tienen un FK a auth.users(id).
 * Necesario porque PostgREST no infiere bien la relación cuando la FK no apunta
 * directamente a profiles.id. Reemplaza .select('..., profiles(full_name)').
 */
export async function attachProfiles<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  rows: T[],
  userIdField: keyof T,
): Promise<(T & { profiles: { full_name: string } | null })[]> {
  if (rows.length === 0) return [] as (T & { profiles: { full_name: string } | null })[]

  const userIds = Array.from(
    new Set(rows.map((r) => r[userIdField]).filter(Boolean) as string[]),
  )
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as { id: string; full_name: string }[] }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))
  return rows.map((r) => {
    const uid = r[userIdField] as string | null | undefined
    return {
      ...r,
      profiles: uid ? { full_name: byId.get(uid) ?? '—' } : null,
    }
  })
}
