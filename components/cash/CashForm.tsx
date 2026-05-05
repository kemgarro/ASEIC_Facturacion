'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type CashMovementState } from '@/lib/actions/cash'

interface CashFormProps {
  action: (state: CashMovementState, formData: FormData) => Promise<CashMovementState>
}

export default function CashForm({ action }: CashFormProps) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="type">Tipo *</Label>
        <select
          id="type"
          name="type"
          required
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecciona tipo</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        {state.errors?.type && (
          <p className="text-sm text-red-600">{state.errors.type[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Monto (₡) *</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
          {state.errors?.amount && (
            <p className="text-sm text-red-600">{state.errors.amount[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Input id="category" name="category" placeholder="Ej: servicios, compras" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Descripción del movimiento"
          required
        />
        {state.errors?.description && (
          <p className="text-sm text-red-600">{state.errors.description[0]}</p>
        )}
      </div>

      {state.message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={pending}
          style={{ backgroundColor: '#2ba5b2', color: 'white' }}
          className="h-11 px-6 font-semibold rounded-xl"
        >
          {pending ? 'Guardando...' : 'Registrar movimiento'}
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" asChild>
          <Link href="/caja">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
