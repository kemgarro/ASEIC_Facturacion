import Link from 'next/link'
import { getPromotions } from '@/lib/actions/promotions'
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from 'lucide-react'
import { formatDateCR } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  pct_discount: '% Descuento',
  fixed_discount: 'Descuento fijo',
  '2x1': '2x1',
  NxM: 'NxM',
  combo: 'Combo',
  bundle: 'Paquete',
}

export default async function PromocionesPage() {
  const promotions = await getPromotions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>Promociones</h1>
        <Button
          asChild
          className="h-11 px-5 text-base font-semibold rounded-xl"
          style={{ backgroundColor: '#2ba5b2', color: 'white' }}
        >
          <Link href="/promociones/nueva">
            <Plus className="h-5 w-5 mr-2" />
            Nueva promoción
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {promotions.map((promo) => {
          const productNames = promo.promotion_products
            .map((pp) => (pp as unknown as { products: { name: string } }).products?.name)
            .filter(Boolean)
            .join(', ')

          return (
            <div
              key={promo.id}
              className="bg-white rounded-2xl shadow-sm p-5 border-l-4 flex flex-col gap-3"
              style={{ borderLeftColor: promo.active ? '#2ba5b2' : '#ccc' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate" style={{ color: '#023e55' }}>{promo.name}</p>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-1"
                    style={{ backgroundColor: '#2ba5b215', color: '#1d7a85' }}
                  >
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
                {promo.type === 'bundle' && <p>{promo.buy_qty} × <strong>₡{Number(promo.combo_price).toFixed(2)}</strong></p>}
                <p className="truncate">Productos: <span className="text-gray-700">{productNames || '—'}</span></p>
                {(promo.starts_at || promo.ends_at) && (
                  <p>
                    {promo.starts_at && `Desde ${formatDateCR(promo.starts_at)}`}
                    {promo.ends_at && ` hasta ${formatDateCR(promo.ends_at)}`}
                  </p>
                )}
              </div>

              <span
                className="self-start px-3 py-1 rounded-full text-xs font-semibold"
                style={
                  promo.active
                    ? { backgroundColor: '#efff3840', color: '#5a7000' }
                    : { backgroundColor: '#f1f1f1', color: '#888' }
                }
              >
                {promo.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          )
        })}

        {promotions.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-16 text-base">
            Sin promociones.{' '}
            <Link href="/promociones/nueva" className="underline font-medium" style={{ color: '#2ba5b2' }}>
              Crear la primera
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
