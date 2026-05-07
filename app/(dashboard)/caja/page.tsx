import Link from 'next/link'
import { getCashMovements, getCashSummary } from '@/lib/actions/cash'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function CajaPage({ searchParams }: PageProps) {
  const { from, to } = await searchParams
  const [movements, summary] = await Promise.all([
    getCashMovements(from, to),
    getCashSummary(from, to),
  ])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>Caja</h1>
        <Button
          asChild
          className="h-11 px-5 text-base font-semibold rounded-xl"
          style={{ backgroundColor: '#2ba5b2', color: 'white' }}
        >
          <Link href="/caja/nuevo">
            <Plus className="h-5 w-5 mr-2" />
            Registrar movimiento
          </Link>
        </Button>
      </div>

      {/* Filtro por fechas */}
      <form method="GET" className="flex flex-wrap gap-3 items-end bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? today}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? today}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 rounded-xl">
          Filtrar
        </Button>
        <Link href="/caja" className="text-sm underline text-gray-400 self-center">
          Ver todo
        </Link>
      </form>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ingresos</p>
            <p className="text-xl font-bold text-green-600">₡{summary.ingresos.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-50">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Egresos</p>
            <p className="text-xl font-bold text-red-600">₡{summary.egresos.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl" style={{ backgroundColor: '#e8f5f7' }}>
            <DollarSign className="h-6 w-6" style={{ color: '#2ba5b2' }} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Neto</p>
            <p
              className="text-xl font-bold"
              style={{ color: summary.neto >= 0 ? '#2ba5b2' : '#c0392b' }}
            >
              ₡{summary.neto.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#023e55' }}>
              <TableHead className="text-white text-base font-semibold py-4">Tipo</TableHead>
              <TableHead className="text-white text-base font-semibold text-right">Monto</TableHead>
              <TableHead className="text-white text-base font-semibold">Descripción</TableHead>
              <TableHead className="text-white text-base font-semibold">Categoría</TableHead>
              <TableHead className="text-white text-base font-semibold">Registrado por</TableHead>
              <TableHead className="text-white text-base font-semibold">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => (
              <TableRow key={m.id} className="hover:bg-gray-50 transition-colors">
                <TableCell>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={
                      m.type === 'ingreso'
                        ? { backgroundColor: '#dcfce7', color: '#16a34a' }
                        : { backgroundColor: '#fee2e2', color: '#dc2626' }
                    }
                  >
                    {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </span>
                </TableCell>
                <TableCell
                  className="text-right text-base font-bold"
                  style={{ color: m.type === 'ingreso' ? '#16a34a' : '#dc2626' }}
                >
                  {m.type === 'egreso' ? '-' : '+'}₡{Number(m.amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-base text-gray-700 max-w-[200px] truncate">{m.description}</TableCell>
                <TableCell className="text-base text-gray-500">{m.category ?? '—'}</TableCell>
                <TableCell className="text-base text-gray-600">
                  {m.profiles?.full_name ?? '—'}
                </TableCell>
                <TableCell className="text-base text-gray-500">
                  {new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-base">
                  Sin movimientos registrados.{' '}
                  <Link href="/caja/nuevo" className="underline font-medium" style={{ color: '#2ba5b2' }}>
                    Registrar primero
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
