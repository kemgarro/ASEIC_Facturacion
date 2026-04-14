'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type ProductState } from '@/lib/actions/products'

type Category = { id: number; name: string }

type Product = {
  id?: number
  name: string
  description: string | null
  sku: string | null
  price: number
  stock: number
  category_id: number | null
  active: boolean
}

interface ProductFormProps {
  action: (state: ProductState, formData: FormData) => Promise<ProductState>
  categories: Category[]
  product?: Product
}

export default function ProductForm({ action, categories, product }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
        {state.errors?.name && <p className="text-sm text-red-600">{state.errors.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" defaultValue={product?.description ?? ''} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" defaultValue={product?.sku ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Categoría</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ''}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Precio *</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product?.price} required />
          {state.errors?.price && <p className="text-sm text-red-600">{state.errors.price[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock *</Label>
          <Input id="stock" name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} required />
          {state.errors?.stock && <p className="text-sm text-red-600">{state.errors.stock[0]}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          value="true"
          defaultChecked={product?.active ?? true}
          className="h-4 w-4"
        />
        <Label htmlFor="active">Producto activo</Label>
      </div>

      {state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/productos">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
