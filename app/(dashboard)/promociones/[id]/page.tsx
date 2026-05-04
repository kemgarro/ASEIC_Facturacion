import { notFound } from 'next/navigation'
import { getPromotionById, updatePromotion } from '@/lib/actions/promotions'
import { getProductsForInventory } from '@/lib/actions/inventory'
import PromotionForm from '@/components/promotions/PromotionForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarPromocionPage({ params }: Props) {
  const { id } = await params
  const [promotion, products] = await Promise.all([
    getPromotionById(Number(id)),
    getProductsForInventory(),
  ])

  if (!promotion) notFound()

  const action = updatePromotion.bind(null, promotion.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>
        Editar promoción
      </h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        <PromotionForm action={action} products={products} promotion={promotion} />
      </div>
    </div>
  )
}
