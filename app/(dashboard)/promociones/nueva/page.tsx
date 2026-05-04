import { createPromotion } from '@/lib/actions/promotions'
import { getProductsForInventory } from '@/lib/actions/inventory'
import PromotionForm from '@/components/promotions/PromotionForm'

export default async function NuevaPromocionPage() {
  const products = await getProductsForInventory()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>
        Nueva promoción
      </h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        <PromotionForm action={createPromotion} products={products} />
      </div>
    </div>
  )
}
