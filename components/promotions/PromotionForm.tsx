'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type PromotionState, type PromotionType, type Promotion } from '@/lib/actions/promotions'

type Product = { id: number; name: string }

interface PromotionFormProps {
  action: (state: PromotionState, formData: FormData) => Promise<PromotionState>
  products: Product[]
  promotion?: Promotion
}

const TYPE_LABELS: Record<PromotionType, string> = {
  pct_discount: '% Descuento',
  fixed_discount: 'Descuento fijo (₡)',
  '2x1': '2x1',
  NxM: 'NxM (ej. 3x2)',
  combo: 'Combo (precio especial)',
  bundle: 'Paquete (N x ₡precio)',
}

export default function PromotionForm({ action, products, promotion }: PromotionFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const [type, setType] = useState<PromotionType>(promotion?.type ?? 'pct_discount')
  const [selectedIds, setSelectedIds] = useState<number[]>(
    promotion?.promotion_products.map((p) => p.product_id) ?? []
  )

  function toggleProduct(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la promoción *</Label>
        <Input id="name" name="name" defaultValue={promotion?.name} required placeholder="ej. 2x1 Refrescos" />
        {state.errors?.name && <p className="text-sm text-red-600">{state.errors.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo *</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PromotionType)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {type === 'pct_discount' && (
        <div className="space-y-2">
          <Label htmlFor="value">Porcentaje de descuento (%)</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0" max="100"
            defaultValue={promotion?.value ?? ''} placeholder="20" />
        </div>
      )}

      {type === 'fixed_discount' && (
        <div className="space-y-2">
          <Label htmlFor="value">Monto de descuento (₡)</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0"
            defaultValue={promotion?.value ?? ''} placeholder="500" />
        </div>
      )}

      {type === 'NxM' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="buy_qty">Compra N unidades</Label>
            <Input id="buy_qty" name="buy_qty" type="number" min="2"
              defaultValue={promotion?.buy_qty ?? 3} placeholder="3" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay_qty">Paga M unidades</Label>
            <Input id="pay_qty" name="pay_qty" type="number" min="1"
              defaultValue={promotion?.pay_qty ?? 2} placeholder="2" />
          </div>
        </div>
      )}

      {type === '2x1' && (
        <>
          <input type="hidden" name="buy_qty" value="2" />
          <input type="hidden" name="pay_qty" value="1" />
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            Por cada 2 unidades del producto, el cliente paga solo 1.
          </div>
        </>
      )}

      {type === 'combo' && (
        <div className="space-y-2">
          <Label htmlFor="combo_price">Precio especial del combo (₡)</Label>
          <Input id="combo_price" name="combo_price" type="number" step="0.01" min="0"
            defaultValue={promotion?.combo_price ?? ''} placeholder="1500" />
        </div>
      )}

      {type === 'bundle' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="buy_qty">Cantidad por paquete</Label>
            <Input id="buy_qty" name="buy_qty" type="number" min="2"
              defaultValue={promotion?.buy_qty ?? 2} placeholder="2" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="combo_price">Precio del paquete (₡)</Label>
            <Input id="combo_price" name="combo_price" type="number" step="0.01" min="0"
              defaultValue={promotion?.combo_price ?? ''} placeholder="1200" />
          </div>
          <p className="col-span-2 text-xs text-gray-500">
            Ej. 2 reposterías × ₡1200. Si el cliente lleva varias unidades del mismo producto seleccionado, se aplica un paquete por cada N unidades.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Fecha inicio</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local"
            defaultValue={promotion?.starts_at?.slice(0, 16) ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">Fecha fin</Label>
          <Input id="ends_at" name="ends_at" type="datetime-local"
            defaultValue={promotion?.ends_at?.slice(0, 16) ?? ''} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          value="true"
          defaultChecked={promotion?.active ?? true}
          className="h-4 w-4"
        />
        <Label htmlFor="active">Promoción activa</Label>
      </div>

      <div className="space-y-2">
        <Label>Productos aplicables *</Label>
        <p className="text-xs text-gray-500">
          {type === 'combo'
            ? 'Selecciona todos los productos que forman el combo.'
            : type === 'bundle'
            ? 'Selecciona los productos a los que aplica el paquete. Cada producto se evalúa por separado.'
            : 'Selecciona los productos a los que aplica esta promoción.'}
        </p>
        <div className="border rounded-xl p-3 max-h-56 overflow-y-auto space-y-1">
          {products.map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
              <input
                type="checkbox"
                name="product_ids"
                value={p.id}
                checked={selectedIds.includes(p.id)}
                onChange={() => toggleProduct(p.id)}
                className="h-4 w-4"
              />
              <span className="text-sm">{p.name}</span>
            </label>
          ))}
        </div>
        {state.errors?.product_ids && (
          <p className="text-sm text-red-600">{state.errors.product_ids[0]}</p>
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
          {pending ? 'Guardando...' : 'Guardar promoción'}
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-xl" asChild>
          <Link href="/promociones">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
