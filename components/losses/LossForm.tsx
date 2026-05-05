'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type LossState } from '@/lib/actions/losses'

type Product = { id: number; name: string; stock: number }

interface LossFormProps {
  action: (state: LossState, formData: FormData) => Promise<LossState>
  products: Product[]
}

export default function LossForm({ action, products }: LossFormProps) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-5 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="product_id">Producto *</Label>
        <select
          id="product_id"
          name="product_id"
          required
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecciona un producto</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — stock actual: {p.stock}
            </option>
          ))}
        </select>
        {state.errors?.product_id && (
          <p className="text-sm text-red-600">{state.errors.product_id[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad perdida *</Label>
          <Input id="quantity" name="quantity" type="number" min="1" placeholder="0" required />
          {state.errors?.quantity && (
            <p className="text-sm text-red-600">{state.errors.quantity[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Costo unitario (₡)</Label>
          <Input id="cost" name="cost" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo *</Label>
        <Textarea
          id="reason"
          name="reason"
          rows={3}
          placeholder="Producto vencido, daño, robo, etc."
          required
        />
        {state.errors?.reason && (
          <p className="text-sm text-red-600">{state.errors.reason[0]}</p>
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
          style={{ backgroundColor: '#c0392b', color: 'white' }}
          className="h-11 px-6 font-semibold rounded-xl"
        >
          {pending ? 'Guardando...' : 'Registrar pérdida'}
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" asChild>
          <Link href="/inventario/perdidas">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
