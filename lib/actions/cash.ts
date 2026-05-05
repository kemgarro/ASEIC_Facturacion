'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
  return { supabase, user }
}

export async function createCashMovement(
  _: CashMovementState,
  formData: FormData
): Promise<CashMovementState> {
  const { supabase, user } = await requireAuth()

  const parsed = CashMovementSchema.safeParse({
    type: formData.get('type'),
    amount: formData.get('amount'),
    description: formData.get('description'),
    category: formData.get('category') || undefined,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase.from('cash_movements').insert({
    ...parsed.data,
    created_by: user.id,
  })

  if (error) return { message: `Error: ${error.message}` }

  revalidatePath('/caja')
  redirect('/caja')
}

export async function getCashMovements(dateFrom?: string, dateTo?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('cash_movements')
    .select('id, type, amount, description, category, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
  if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

  const { data } = await query
  return data ?? []
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
