import { createClient } from '@/lib/supabase/server'
import { getActivePromotions } from '@/lib/actions/promotions'
import { getCashMovements, getCashSummary, createCashMovement } from '@/lib/actions/cash'
import { attachProfiles } from '@/lib/supabase/relations'
import ProductGrid from '@/components/pos/ProductGrid'
import Cart from '@/components/pos/Cart'
import CashForm from '@/components/cash/CashForm'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatDateTimeCR } from '@/lib/utils'
import type { Promotion } from '@/lib/actions/promotions'

type ProductRow = {
  id: number
  name: string
  price: number
  stock: number
  categories: { name: string }[] | null
}

interface PageProps {
  searchParams: Promise<{ tab?: string; from?: string; to?: string }>
}

const TABS = [
  { key: 'pos', label: 'Nueva Venta' },
  { key: 'historial', label: 'Historial' },
  { key: 'caja', label: 'Caja' },
]

export default async function VentasPage({ searchParams }: PageProps) {
  const { tab, from, to } = await searchParams
  const activeTab = tab ?? 'pos'
  const today = new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  const [{ data: products }, promotions] = await Promise.all([
    activeTab === 'pos'
      ? supabase
          .from('products')
          .select('id, name, price, stock, categories(name)')
          .eq('active', true)
          .order('name')
      : Promise.resolve({ data: [] as ProductRow[] }),
    activeTab === 'pos' ? getActivePromotions() : Promise.resolve([] as Promotion[]),
  ])

  type SaleRow = {
    id: number
    total: number
    status: string
    created_at: string
    seller_id: string | null
    sale_items: { quantity: number }[]
    profiles: { full_name: string } | null
  }
  let sales: SaleRow[] | null = null
  if (activeTab === 'historial') {
    const { data: salesRaw } = await supabase
      .from('sales')
      .select('id, total, status, created_at, seller_id, sale_items(quantity)')
      .order('created_at', { ascending: false })
      .limit(100)
    const enriched = await attachProfiles(supabase, (salesRaw ?? []) as Record<string, unknown>[], 'seller_id')
    sales = enriched as unknown as SaleRow[]
  }

  const [cashMovements, cashSummary] = activeTab === 'caja'
    ? await Promise.all([getCashMovements(from, to), getCashSummary(from, to)])
    : [null, null]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <a
            key={key}
            href={`/ventas?tab=${key}`}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              activeTab === key
                ? { backgroundColor: '#023e55', color: 'white' }
                : { backgroundColor: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }
            }
          >
            {label}
          </a>
        ))}
      </div>

      {/* POS */}
      {activeTab === 'pos' && (
        <div className="flex flex-col lg:flex-row gap-5 h-full">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <ProductGrid products={(products ?? []) as ProductRow[]} />
          </div>
          <div
            className="rounded-2xl shadow-sm p-5 flex flex-col border-t-4 w-full lg:w-80 lg:shrink-0"
            style={{ backgroundColor: 'white', borderTopColor: '#2ba5b2' }}
          >
            <Cart promotions={promotions as Promotion[]} />
          </div>
        </div>
      )}

      {/* Historial */}
      {activeTab === 'historial' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#023e55' }}>
                <TableHead className="text-white text-base font-semibold py-4">ID</TableHead>
                <TableHead className="text-white text-base font-semibold">Fecha</TableHead>
                <TableHead className="text-white text-base font-semibold">Vendedor</TableHead>
                <TableHead className="text-white text-base font-semibold text-right">Items</TableHead>
                <TableHead className="text-white text-base font-semibold text-right">Total</TableHead>
                <TableHead className="text-white text-base font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="text-base font-medium" style={{ color: '#3b4e73' }}>#{s.id}</TableCell>
                  <TableCell className="text-base text-gray-600">
                    {formatDateTimeCR(s.created_at)}
                  </TableCell>
                  <TableCell className="text-base font-medium" style={{ color: '#023e55' }}>
                    {s.profiles?.full_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-base text-gray-600">
                    {(s.sale_items as { quantity: number }[])?.reduce((sum, i) => sum + i.quantity, 0) ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-base font-bold" style={{ color: '#2ba5b2' }}>
                    ₡{Number(s.total).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{ backgroundColor: '#efff3840', color: '#5a7000' }}
                    >
                      {s.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {(!sales || sales.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-base">
                    No hay ventas registradas aún
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Caja */}
      {activeTab === 'caja' && (
        <div className="space-y-5">
          <form method="GET" className="flex flex-wrap gap-3 items-end bg-white rounded-2xl shadow-sm p-4">
            <input type="hidden" name="tab" value="caja" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Desde</label>
              <input type="date" name="from" defaultValue={from ?? today}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Hasta</label>
              <input type="date" name="to" defaultValue={to ?? today}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <button type="submit"
              className="h-10 px-4 rounded-xl border border-input bg-background text-sm font-medium hover:bg-gray-50">
              Filtrar
            </button>
            <a href="/ventas?tab=caja" className="text-sm underline text-gray-400 self-center">Ver todo</a>
          </form>

          {cashSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Ingresos', value: cashSummary.ingresos, icon: TrendingUp, color: '#16a34a', bg: '#dcfce7' },
                { label: 'Egresos', value: cashSummary.egresos, icon: TrendingDown, color: '#dc2626', bg: '#fee2e2' },
                { label: 'Neto', value: cashSummary.neto, icon: DollarSign, color: cashSummary.neto >= 0 ? '#2ba5b2' : '#c0392b', bg: '#e8f5f7' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl" style={{ backgroundColor: bg }}>
                    <Icon className="h-6 w-6" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-xl font-bold" style={{ color }}>
                      ₡{value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-base mb-4" style={{ color: '#023e55' }}>Registrar movimiento</h2>
              <CashForm action={createCashMovement} />
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: '#023e55' }}>
                    <TableHead className="text-white font-semibold py-4">Tipo</TableHead>
                    <TableHead className="text-white font-semibold text-right">Monto</TableHead>
                    <TableHead className="text-white font-semibold">Descripción</TableHead>
                    <TableHead className="text-white font-semibold">Usuario</TableHead>
                    <TableHead className="text-white font-semibold">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cashMovements ?? []).map((m) => (
                    <TableRow key={m.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={m.type === 'ingreso'
                            ? { backgroundColor: '#dcfce7', color: '#16a34a' }
                            : { backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-base font-bold"
                        style={{ color: m.type === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                        {m.type === 'egreso' ? '-' : '+'}₡{Number(m.amount).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-base text-gray-700 max-w-[160px] truncate">{m.description}</TableCell>
                      <TableCell className="text-base text-gray-600">
                        {m.profiles?.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-base text-gray-500">
                        {formatDateTimeCR(m.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(cashMovements ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-12 text-base">
                        Sin movimientos en este período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
