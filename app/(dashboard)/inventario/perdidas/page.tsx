import Link from 'next/link'
import { getLosses } from '@/lib/actions/losses'
import { pickOne } from '@/lib/supabase/relations'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { formatDateTimeCR } from '@/lib/utils'

export default async function PerdidasPage() {
  const losses = await getLosses()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>Pérdidas</h1>
        <Button
          asChild
          className="h-11 px-5 text-base font-semibold rounded-xl"
          style={{ backgroundColor: '#c0392b', color: 'white' }}
        >
          <Link href="/inventario/perdidas/nueva">
            <Plus className="h-5 w-5 mr-2" />
            Registrar pérdida
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
              <TableHead className="text-white text-base font-semibold">Motivo</TableHead>
              <TableHead className="text-white text-base font-semibold">Registrado por</TableHead>
              <TableHead className="text-white text-base font-semibold">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {losses.map((l) => (
              <TableRow key={l.id} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-semibold text-base" style={{ color: '#023e55' }}>
                  {pickOne<{ name: string }>(l.products as unknown as { name: string } | { name: string }[] | null)?.name ?? '—'}
                </TableCell>
                <TableCell className="text-right text-base font-bold text-red-600">
                  -{l.quantity}
                </TableCell>
                <TableCell className="text-right text-base text-gray-600">
                  {l.cost ? `₡${Number(l.cost).toFixed(2)}` : '—'}
                </TableCell>
                <TableCell className="text-base text-gray-600 max-w-[200px] truncate">{l.reason}</TableCell>
                <TableCell className="text-base text-gray-600">
                  {l.profiles?.full_name ?? '—'}
                </TableCell>
                <TableCell className="text-base text-gray-500">
                  {formatDateTimeCR(l.created_at)}
                </TableCell>
              </TableRow>
            ))}
            {losses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-base">
                  Sin pérdidas registradas.{' '}
                  <Link href="/inventario/perdidas/nueva" className="underline font-medium" style={{ color: '#c0392b' }}>
                    Registrar primera pérdida
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
