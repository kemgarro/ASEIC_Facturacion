import { createLoss, getProductsForLosses } from '@/lib/actions/losses'
import LossForm from '@/components/losses/LossForm'

export default async function NuevaPerdidaPage() {
  const products = await getProductsForLosses()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>
        Registrar pérdida
      </h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        <LossForm action={createLoss} products={products} />
      </div>
    </div>
  )
}
