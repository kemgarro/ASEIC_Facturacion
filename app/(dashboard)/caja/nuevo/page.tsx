import { createCashMovement } from '@/lib/actions/cash'
import CashForm from '@/components/cash/CashForm'

export default function NuevoMovimientoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#023e55' }}>
        Registrar movimiento de caja
      </h1>
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        <CashForm action={createCashMovement} />
      </div>
    </div>
  )
}
