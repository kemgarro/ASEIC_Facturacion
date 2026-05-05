import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getInventoryEntries } from '@/lib/actions/inventory'
import { getLosses } from '@/lib/actions/losses'
import { getPromotions } from '@/lib/actions/promotions'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

const TABS = [
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'entradas', label: 'Entradas' },
  { key: 'perdidas', label: 'Pérdidas' },
  { key: 'promociones', label: 'Promociones' },
]

const TYPE_LABELS: Record<string, string> = {
  pct_discount: '% Descuento',
  fixed_discount: 'Descuento fijo',
  '2x1': '2x1',
  NxM: 'NxM',
  combo: 'Combo',
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const { tab } = await searchParams
  const activeTab = tab ?? 'catalogo'

  const supabase = await createClient()

  const { data: products } = activeTab === 'catalogo'
    ? await supabase.from('products').select('id, name, sku, price, stock, active, categories(name)').order('name')
    : { data: null }

  const entries = activeTab === 'entradas' ? await getInventoryEntries() : []
  const losses = activeTab === 'perdidas' ? await getLosses() : []
  const promotions = activeTab === 'promociones' ? await getPromotions() : []

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <a
            key={key}
            href={`/productos?tab=${key}`}
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

      {/* Catálogo */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button asChild className="h-11 px-5 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#2ba5b2', color: 'white' }}>
              <Link href="/productos/nuevo"><Plus className="h-5 w-5 mr-2" />Nuevo producto</Link>
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
                      <span className="px-2 py-1 rounded-lg font-semibold text-sm"
                        style={p.stock < 5
                          ? { backgroundColor: '#f7af0220', color: '#b07d00' }
                          : { backgroundColor: '#2ba5b215', color: '#1d7a85' }}>
                        {p.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full text-sm font-semibold"
                        style={p.active
                          ? { backgroundColor: '#efff3840', color: '#5a7000' }
                          : { backgroundColor: '#f1f1f1', color: '#888' }}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/productos/${p.id}`}><Pencil className="h-4 w-4" style={{ color: '#3b4e73' }} /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!products || products.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-12 text-base">
                      No hay productos.{' '}
                      <Link href="/productos/nuevo" className="underline font-medium" style={{ color: '#2ba5b2' }}>Crear el primero</Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Entradas de inventario */}
      {activeTab === 'entradas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button asChild className="h-11 px-5 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#2ba5b2', color: 'white' }}>
              <Link href="/inventario/nuevo"><Plus className="h-5 w-5 mr-2" />Registrar entrada</Link>
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
                    <TableCell className="text-right text-base font-bold" style={{ color: '#2ba5b2' }}>+{e.quantity}</TableCell>
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
                      Sin entradas.{' '}
                      <Link href="/inventario/nuevo" className="underline font-medium" style={{ color: '#2ba5b2' }}>Registrar primera</Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pérdidas */}
      {activeTab === 'perdidas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button asChild className="h-11 px-5 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#c0392b', color: 'white' }}>
              <Link href="/inventario/perdidas/nueva"><Plus className="h-5 w-5 mr-2" />Registrar pérdida</Link>
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
                      {((l.products as unknown) as { name: string }[] | null)?.[0]?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-base font-bold text-red-600">-{l.quantity}</TableCell>
                    <TableCell className="text-right text-base text-gray-600">
                      {l.cost ? `₡${Number(l.cost).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-base text-gray-600 max-w-[200px] truncate">{l.reason}</TableCell>
                    <TableCell className="text-base text-gray-600">
                      {((l.profiles as unknown) as { full_name: string }[] | null)?.[0]?.full_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-base text-gray-500">
                      {new Date(l.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                  </TableRow>
                ))}
                {losses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-12 text-base">
                      Sin pérdidas registradas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Promociones */}
      {activeTab === 'promociones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button asChild className="h-11 px-5 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#2ba5b2', color: 'white' }}>
              <Link href="/promociones/nueva"><Plus className="h-5 w-5 mr-2" />Nueva promoción</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {promotions.map((promo) => {
              const productNames = promo.promotion_products
                .map((pp) => (pp as unknown as { products: { name: string } }).products?.name)
                .filter(Boolean).join(', ')
              return (
                <div key={promo.id} className="bg-white rounded-2xl shadow-sm p-5 border-l-4 flex flex-col gap-3"
                  style={{ borderLeftColor: promo.active ? '#2ba5b2' : '#ccc' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate" style={{ color: '#023e55' }}>{promo.name}</p>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-1"
                        style={{ backgroundColor: '#2ba5b215', color: '#1d7a85' }}>
                        {TYPE_LABELS[promo.type] ?? promo.type}
                      </span>
                    </div>
                    <Link href={`/promociones/${promo.id}`}>
                      <Pencil className="h-4 w-4 mt-1" style={{ color: '#3b4e73' }} />
                    </Link>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    {promo.type === 'pct_discount' && <p>Descuento: <strong>{promo.value}%</strong></p>}
                    {promo.type === 'fixed_discount' && <p>Descuento: <strong>₡{Number(promo.value).toFixed(2)}</strong></p>}
                    {promo.type === '2x1' && <p>Por cada 2 unidades, paga 1</p>}
                    {promo.type === 'NxM' && <p>Por cada {promo.buy_qty} unidades, paga {promo.pay_qty}</p>}
                    {promo.type === 'combo' && <p>Precio combo: <strong>₡{Number(promo.combo_price).toFixed(2)}</strong></p>}
                    <p className="truncate">Productos: <span className="text-gray-700">{productNames || '—'}</span></p>
                  </div>
                  <span className="self-start px-3 py-1 rounded-full text-xs font-semibold"
                    style={promo.active
                      ? { backgroundColor: '#efff3840', color: '#5a7000' }
                      : { backgroundColor: '#f1f1f1', color: '#888' }}>
                    {promo.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              )
            })}
            {promotions.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-16 text-base">
                Sin promociones.{' '}
                <Link href="/promociones/nueva" className="underline font-medium" style={{ color: '#2ba5b2' }}>Crear la primera</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
