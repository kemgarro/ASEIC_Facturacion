import Link from 'next/link'
import { getInventoryEntries } from '@/lib/actions/inventory'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'

export default async function InventarioPage() {
  const entries = await getInventoryEntries()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>Inventario</h1>
        <Button
          asChild
          className="h-11 px-5 text-base font-semibold rounded-xl"
          style={{ backgroundColor: '#2ba5b2', color: 'white' }}
        >
          <Link href="/inventario/nuevo">
            <Plus className="h-5 w-5 mr-2" />
            Registrar entrada
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#023e55' }}>
              <TableHead className="text-white text-base font-semibold py-4">Producto</TableHead>
              <TableHead className="text-white text-base font-semibold text-right">Cantidad</TableHead>
              <TableHead className="text-white text-base font-semibold text-right">Costo unit.</TableHead>
              <TableHead className="text-white text-base font-semibold">Proveedor</TableHead>
              <TableHead className="text-white text-base font-semibold">Notas</TableHead>
              <TableHead className="text-white text-base font-semibold">Registrado por</TableHead>
              <TableHead className="text-white text-base font-semibold">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-semibold text-base" style={{ color: '#023e55' }}>
                  {((e.products as unknown) as { name: string }[] | null)?.[0]?.name ?? '—'}
                </TableCell>
                <TableCell className="text-right text-base font-bold" style={{ color: '#2ba5b2' }}>
                  +{e.quantity}
                </TableCell>
                <TableCell className="text-right text-base text-gray-600">
                  {e.cost ? `₡${Number(e.cost).toFixed(2)}` : '—'}
                </TableCell>
                <TableCell className="text-base text-gray-600">{e.supplier ?? '—'}</TableCell>
                <TableCell className="text-base text-gray-500 max-w-[180px] truncate">{e.notes ?? '—'}</TableCell>
                <TableCell className="text-base text-gray-600">
                  {((e.profiles as unknown) as { full_name: string }[] | null)?.[0]?.full_name ?? '—'}
                </TableCell>
                <TableCell className="text-base text-gray-500">
                  {new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12 text-base">
                  Sin entradas registradas.{' '}
                  <Link href="/inventario/nuevo" className="underline font-medium" style={{ color: '#2ba5b2' }}>
                    Registrar primera entrada
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
