'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/actions/audit'
import { attachProfiles } from '@/lib/supabase/relations'

const CashMovementSchema = z.object({
  type: z.enum(['ingreso', 'egreso']),
  amount: z.coerce.number().positive('Monto debe ser mayor a 0'),
  description: z.string().min(1, 'Descripción requerida'),
  category: z.string().optional(),
})

export type CashMovementState = {
  errors?: Record<string, string[]>
  message?: string
}

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single()
  return { supabase, user, userName: profile?.full_name ?? user.email ?? user.id }
}

export async function createCashMovement(
  _: CashMovementState,
  formData: FormData
): Promise<CashMovementState> {
  const { supabase, user, userName } = await requireAuth()

  const parsed = CashMovementSchema.safeParse({
    type: formData.get('type'),
    amount: formData.get('amount'),
    description: formData.get('description'),
    category: formData.get('category') || undefined,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { data: movement, error } = await supabase
    .from('cash_movements')
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !movement) return { message: `Error: ${error?.message ?? 'No se pudo registrar el movimiento'}` }

  await logAudit(supabase, user.id, userName, 'caja_movimiento', 'cash_movement', movement.id, {
    type: parsed.data.type,
    amount: parsed.data.amount,
    description: parsed.data.description,
    category: parsed.data.category,
  })

  revalidatePath('/caja')
  redirect('/caja')
}

export async function getCashMovements(dateFrom?: string, dateTo?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('cash_movements')
    .select('id, type, amount, description, category, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(500)

  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
  if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

  const { data, error } = await query
  if (error) {
    console.error('[cash] getCashMovements failed', error.message)
    return []
  }
  return attachProfiles(supabase, data ?? [], 'created_by')
}

export async function getCashSummary(dateFrom?: string, dateTo?: string) {
  const movements = await getCashMovements(dateFrom, dateTo)

  const ingresos = movements
    .filter((m) => m.type === 'ingreso')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  const egresos = movements
    .filter((m) => m.type === 'egreso')
    .reduce((sum, m) => sum + Number(m.amount), 0)

  return { ingresos, egresos, neto: ingresos - egresos, total: movements.length }
}
