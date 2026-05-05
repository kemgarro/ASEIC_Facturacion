import { getSalesReport, getStockReport } from '@/lib/actions/reports'
import { getAuditLog } from '@/lib/actions/audit'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { BarChart3, Package, TrendingUp, ShoppingBag, Receipt } from 'lucide-react'
import Link from 'next/link'
import ExportButton from './ExportButton'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>
}

const AUDIT_TYPE_LABELS: Record<string, string> = {
  venta_creada: 'Venta',
  venta_anulada: 'Anulación',
  producto_creado: 'Prod. creado',
  producto_editado: 'Prod. editado',
  inventario_entrada: 'Inventario',
  perdida_registrada: 'Pérdida',
  caja_movimiento: 'Caja',
  promocion_creada: 'Promo. creada',
  promocion_editada: 'Promo. editada',
}
const AUDIT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  venta_creada: { bg: '#dcfce7', color: '#16a34a' },
  venta_anulada: { bg: '#fee2e2', color: '#dc2626' },
  producto_creado: { bg: '#dbeafe', color: '#2563eb' },
  producto_editado: { bg: '#e0e7ff', color: '#4338ca' },
  inventario_entrada: { bg: '#dbeafe', color: '#2563eb' },
  perdida_registrada: { bg: '#fef3c7', color: '#d97706' },
  caja_movimiento: { bg: '#f3e8ff', color: '#7c3aed' },
  promocion_creada: { bg: '#fce7f3', color: '#be185d' },
  promocion_editada: { bg: '#fce7f3', color: '#be185d' },
}

function getDefaultDates() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  return { firstDay, today }
}

export default async function ReportesPage({ searchParams }: PageProps) {
  const { from, to, tab } = await searchParams
  const { firstDay, today } = getDefaultDates()
  const dateFrom = from ?? firstDay
  const dateTo = to ?? today
  const activeTab = tab ?? 'ventas'

  const [salesReport, stockReport, auditEntries] = await Promise.all([
    getSalesReport(dateFrom, dateTo),
    getStockReport(),
    activeTab === 'auditoria' ? getAuditLog({ dateFrom, dateTo }) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>Reportes</h1>
        <ExportButton salesReport={salesReport} stockReport={stockReport} dateFrom={dateFrom} dateTo={dateTo} />
      </div>

      {/* Filtro fechas */}
      <form method="GET" className="flex flex-wrap gap-3 items-end bg-white rounded-2xl shadow-sm p-4">
        <input type="hidden" name="tab" value={activeTab} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Desde</label>
          <input
            type="date"
            name="from"
            defaultValue={dateFrom}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Hasta</label>
          <input
            type="date"
            name="to"
            defaultValue={dateTo}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 rounded-xl">
          Aplicar
        </Button>
      </form>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'ventas', label: 'Ventas', icon: BarChart3 },
          { key: 'stock', label: 'Stock', icon: Package },
          { key: 'auditoria', label: 'Auditoría', icon: Receipt },
        ].map(({ key, label, icon: Icon }) => (
          <a
            key={key}
            href={`/reportes?from=${dateFrom}&to=${dateTo}&tab=${key}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              activeTab === key
                ? { backgroundColor: '#023e55', color: 'white' }
                : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        ))}
      </div>

      {activeTab === 'ventas' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Ventas', value: salesReport.totalSales.toString(), icon: Receipt, color: '#2ba5b2' },
              { label: 'Ingresos', value: `₡${salesReport.totalRevenue.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#16a34a' },
              { label: 'Artículos', value: salesReport.totalItems.toString(), icon: ShoppingBag, color: '#7c3aed' },
              { label: 'Ticket prom.', value: `₡${salesReport.avgTicket.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`, icon: BarChart3, color: '#d97706' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold" style={{ color: '#023e55' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top productos */}
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-base" style={{ color: '#023e55' }}>Top productos por ingresos</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: '#f8fafc' }}>
                  <TableHead className="font-semibold text-gray-600">#</TableHead>
                  <TableHead className="font-semibold text-gray-600">Producto</TableHead>
                  <TableHead className="font-semibold text-gray-600 text-right">Cantidad</TableHead>
                  <TableHead className="font-semibold text-gray-600 text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReport.topProducts.map((p, i) => (
                  <TableRow key={p.name} className="hover:bg-gray-50">
                    <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                    <TableCell className="font-medium" style={{ color: '#023e55' }}>{p.name}</TableCell>
                    <TableCell className="text-right text-gray-600">{p.qty}</TableCell>
                    <TableCell className="text-right font-semibold" style={{ color: '#2ba5b2' }}>
                      ₡{p.revenue.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {salesReport.topProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      Sin ventas en el período seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Ventas por día */}
          {salesReport.byDay.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <div className="px-6 py-4 border-b">
                <h2 className="font-semibold text-base" style={{ color: '#023e55' }}>Ventas por día</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: '#f8fafc' }}>
                    <TableHead className="font-semibold text-gray-600">Fecha</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-right">Ventas</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesReport.byDay.map((d) => (
                    <TableRow key={d.date} className="hover:bg-gray-50">
                      <TableCell className="text-gray-700">
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('es-CR', { dateStyle: 'medium' })}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">{d.sales}</TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: '#16a34a' }}>
                        ₡{d.revenue.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#e8f5f7' }}>
                <Package className="h-6 w-6" style={{ color: '#2ba5b2' }} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Valor total inventario</p>
                <p className="text-xl font-bold" style={{ color: '#023e55' }}>
                  ₡{stockReport.totalValue.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-50">
                <Package className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Productos stock bajo (&lt;5)</p>
                <p className="text-xl font-bold text-red-600">{stockReport.lowStock}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: '#023e55' }}>
                  <TableHead className="text-white font-semibold py-4">Producto</TableHead>
                  <TableHead className="text-white font-semibold text-right">Stock</TableHead>
                  <TableHead className="text-white font-semibold text-right">Precio unit.</TableHead>
                  <TableHead className="text-white font-semibold text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockReport.products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium" style={{ color: '#023e55' }}>{p.name}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className="font-bold"
                        style={{ color: p.stock < 5 ? '#dc2626' : p.stock < 10 ? '#d97706' : '#16a34a' }}
                      >
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      ₡{p.price.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-700">
                      ₡{p.value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{auditEntries.length} registro(s) en el período</p>
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: '#023e55' }}>
                  <TableHead className="text-white font-semibold py-4">Tipo</TableHead>
                  <TableHead className="text-white font-semibold">Descripción</TableHead>
                  <TableHead className="text-white font-semibold text-right">Monto</TableHead>
                  <TableHead className="text-white font-semibold">Usuario</TableHead>
                  <TableHead className="text-white font-semibold">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEntries.map((e) => {
                  const color = AUDIT_TYPE_COLORS[e.type] ?? { bg: '#f3f4f6', color: '#6b7280' }
                  return (
                    <TableRow key={e.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: color.bg, color: color.color }}>
                          {AUDIT_TYPE_LABELS[e.type] ?? e.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-base text-gray-700 max-w-[300px] truncate">{e.description}</TableCell>
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
                {auditEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-12 text-base">
                      Sin registros en el período seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
