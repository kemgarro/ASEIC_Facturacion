import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil } from 'lucide-react'

export default async function ProductosPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, price, stock, active, categories(name)')
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" style={{ color: '#023e55' }}>Productos</h1>
        <Button
          asChild
          className="h-11 px-5 text-base font-semibold rounded-xl"
          style={{ backgroundColor: '#2ba5b2', color: 'white' }}
        >
          <Link href="/productos/nuevo">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#023e55' }}>
              <TableHead className="text-white text-base font-semibold py-4">Nombre</TableHead>
              <TableHead className="text-white text-base font-semibold">SKU</TableHead>
              <TableHead className="text-white text-base font-semibold">Categoría</TableHead>
              <TableHead className="text-white text-base font-semibold text-right">Precio</TableHead>
              <TableHead className="text-white text-base font-semibold text-right">Stock</TableHead>
              <TableHead className="text-white text-base font-semibold">Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((p) => (
              <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-semibold text-base" style={{ color: '#023e55' }}>{p.name}</TableCell>
                <TableCell className="text-base text-gray-500">{p.sku ?? '—'}</TableCell>
                <TableCell className="text-base text-gray-500">
                  {(p.categories as { name: string }[] | null)?.[0]?.name ?? '—'}
                </TableCell>
                <TableCell className="text-right text-base font-medium" style={{ color: '#3b4e73' }}>
                  ₡{Number(p.price).toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-base">
                  <span
                    className="px-2 py-1 rounded-lg font-semibold text-sm"
                    style={
                      p.stock < 5
                        ? { backgroundColor: '#f7af0220', color: '#b07d00' }
                        : { backgroundColor: '#2ba5b215', color: '#1d7a85' }
                    }
                  >
                    {p.stock}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={
                      p.active
                        ? { backgroundColor: '#efff3840', color: '#5a7000' }
                        : { backgroundColor: '#f1f1f1', color: '#888' }
                    }
                  >
                    {p.active ? 'Activo' : 'Inactivo'}
                  </span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/productos/${p.id}`}>
                      <Pencil className="h-4 w-4" style={{ color: '#3b4e73' }} />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!products || products.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12 text-base">
                  No hay productos.{' '}
                  <Link href="/productos/nuevo" className="underline font-medium" style={{ color: '#2ba5b2' }}>
                    Crear el primero
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
