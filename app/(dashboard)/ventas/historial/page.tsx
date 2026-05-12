import { createClient } from '@/lib/supabase/server'
import { attachProfiles } from '@/lib/supabase/relations'
import { formatDateTimeCR } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import DeleteSaleButton from './DeleteSaleButton'

export default async function HistorialPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewerProfile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = viewerProfile?.role === 'admin'

  const { data: salesRaw } = await supabase
    .from('sales')
    .select('id, total, status, created_at, seller_id, sale_items(quantity)')
    .order('created_at', { ascending: false })
    .limit(100)

  const sales = await attachProfiles(supabase, salesRaw ?? [], 'seller_id')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: '#023e55' }}>Historial de Ventas</h1>

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
              {isAdmin && <TableHead className="text-white text-base font-semibold text-right">Acciones</TableHead>}
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
                {isAdmin && (
                  <TableCell className="text-right">
                    <DeleteSaleButton saleId={s.id} saleTotal={Number(s.total)} />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!sales || sales.length === 0) && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-gray-400 py-12 text-base">
                  No hay ventas registradas aún
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
