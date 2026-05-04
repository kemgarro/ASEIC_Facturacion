import { createInventoryEntry, getProductsForInventory } from '@/lib/actions/inventory'
import InventoryForm from '@/components/inventory/InventoryForm'

export default async function NuevoInventarioPage() {
  const products = await getProductsForInventory()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>
        Registrar entrada de inventario
      </h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        <InventoryForm action={createInventoryEntry} products={products} />
      </div>
    </div>
  )
}
