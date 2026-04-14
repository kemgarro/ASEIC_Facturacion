import { createClient } from '@/lib/supabase/server'
import { ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: ventasHoy }, { data: stockBajo }, { data: totalVentas }] = await Promise.all([
    supabase.from('sales').select('id, total').gte('created_at', today),
    supabase.from('products').select('id, name, stock').lt('stock', 5).eq('active', true),
    supabase.from('sales').select('total'),
  ])

  const totalHoy = ventasHoy?.reduce((sum, v) => sum + Number(v.total), 0) ?? 0
  const totalGeneral = totalVentas?.reduce((sum, v) => sum + Number(v.total), 0) ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: '#023e55' }}>Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#2ba5b2' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-gray-500">Ventas hoy</p>
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#2ba5b220' }}>
              <ShoppingCart className="h-5 w-5" style={{ color: '#2ba5b2' }} />
            </div>
          </div>
          <p className="text-4xl font-bold mb-1" style={{ color: '#023e55' }}>{ventasHoy?.length ?? 0}</p>
          <p className="text-base text-gray-500">Total: <span className="font-semibold" style={{ color: '#2ba5b2' }}>₡{totalHoy.toFixed(2)}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#f7af02' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-gray-500">Total general</p>
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#f7af0220' }}>
              <TrendingUp className="h-5 w-5" style={{ color: '#f7af02' }} />
            </div>
          </div>
          <p className="text-4xl font-bold mb-1" style={{ color: '#023e55' }}>₡{totalGeneral.toFixed(2)}</p>
          <p className="text-base text-gray-500">Acumulado total</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4" style={{ borderLeftColor: '#3b4e73' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-medium text-gray-500">Stock bajo</p>
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#f7af0220' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: '#f7af02' }} />
            </div>
          </div>
          <p className="text-4xl font-bold mb-1" style={{ color: stockBajo?.length ? '#f7af02' : '#023e55' }}>
            {stockBajo?.length ?? 0}
          </p>
          <p className="text-base text-gray-500">productos &lt;5 unidades</p>
        </div>
      </div>

      {stockBajo && stockBajo.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4" style={{ color: '#3b4e73' }}>
            <AlertTriangle className="h-5 w-5" style={{ color: '#f7af02' }} />
            Productos con stock bajo
          </h2>
          <ul className="space-y-2">
            {stockBajo.map((p) => (
              <li key={p.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-base text-gray-700">{p.name}</span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: '#f7af0220', color: '#b07d00' }}
                >
                  {p.stock} unid.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
