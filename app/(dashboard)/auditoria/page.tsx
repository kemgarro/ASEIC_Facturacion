import { getAuditLog } from '@/lib/actions/audit'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; type?: string }>
}

const TYPE_LABELS: Record<string, string> = {
  venta: 'Venta',
  anulacion: 'Anulación',
  inventario: 'Inventario',
  perdida: 'Pérdida',
  caja: 'Caja',
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  venta: { bg: '#dcfce7', color: '#16a34a' },
  anulacion: { bg: '#fee2e2', color: '#dc2626' },
  inventario: { bg: '#dbeafe', color: '#2563eb' },
  perdida: { bg: '#fef3c7', color: '#d97706' },
  caja: { bg: '#f3e8ff', color: '#7c3aed' },
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const { from, to, type } = await searchParams
  const entries = await getAuditLog({ dateFrom: from, dateTo: to, type })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>Auditoría</h1>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3 items-end bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Tipo</label>
          <select
            name="type"
            defaultValue={type ?? ''}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="venta">Ventas</option>
            <option value="anulacion">Anulaciones</option>
            <option value="inventario">Inventario</option>
            <option value="perdida">Pérdidas</option>
            <option value="caja">Caja</option>
          </select>
        </div>
        <Button type="submit" variant="outline" className="h-10 rounded-xl">
          Filtrar
        </Button>
        <Link href="/auditoria" className="text-sm underline text-gray-400 self-center">
          Limpiar filtros
        </Link>
      </form>

      <p className="text-sm text-gray-500">{entries.length} registro(s)</p>

      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: '#023e55' }}>
              <TableHead className="text-white text-base font-semibold py-4">Tipo</TableHead>
              <TableHead className="text-white text-base font-semibold">Descripción</TableHead>
              <TableHead className="text-white text-base font-semibold text-right">Monto</TableHead>
              <TableHead className="text-white text-base font-semibold">Usuario</TableHead>
              <TableHead className="text-white text-base font-semibold">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => {
              const color = TYPE_COLORS[e.type] ?? { bg: '#f3f4f6', color: '#6b7280' }
              return (
                <TableRow key={e.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell>
                    <span
                      className="px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: color.bg, color: color.color }}
                    >
                      {TYPE_LABELS[e.type] ?? e.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-base text-gray-700 max-w-[300px] truncate">
                    {e.description}
                  </TableCell>
                  <TableCell className="text-right text-base text-gray-600">
                    {e.amount != null ? `₡${e.amount.toLocaleString('es-CR', { minimumFractionDigits: 2 })}` : '—'}
                  </TableCell>
                  <TableCell className="text-base text-gray-600">{e.user_name}</TableCell>
                  <TableCell className="text-base text-gray-500">
                    {new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                </TableRow>
              )
            })}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-12 text-base">
                  Sin registros para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
