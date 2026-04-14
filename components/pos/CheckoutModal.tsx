'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { createSale } from '@/lib/actions/sales'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ShoppingCart, CheckCircle2 } from 'lucide-react'

export default function CheckoutModal() {
  const { items, total, clearCart } = useCartStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setLoading(true)
    setError('')
    const result = await createSale(items)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setDone(true)
    clearCart()
  }

  function handleClose() {
    setOpen(false)
    setDone(false)
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDone(false); setError('') } }}>
      <DialogTrigger asChild>
        <Button
          className="w-full h-14 text-lg font-bold rounded-xl shadow-md hover:opacity-90"
          style={{ backgroundColor: '#f7af02', color: '#023e55' }}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Cobrar ₡{total().toFixed(2)}
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold" style={{ color: '#023e55' }}>
            {done ? '¡Venta completada!' : 'Confirmar venta'}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-20 w-20" style={{ color: '#2ba5b2' }} />
            <p className="text-lg font-semibold text-gray-700">Venta registrada correctamente</p>
            <Button
              onClick={handleClose}
              className="w-full h-12 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#2ba5b2', color: 'white' }}
            >
              Nueva venta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: '#eef4f6' }}>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-base">
                  <span className="text-gray-700">{item.name} × {item.quantity}</span>
                  <span className="font-semibold" style={{ color: '#3b4e73' }}>
                    ₡{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTop: '1px solid #d0dde2' }}>
                <span style={{ color: '#023e55' }}>Total</span>
                <span style={{ color: '#023e55' }}>₡{total().toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 text-base rounded-xl" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold rounded-xl"
                style={{ backgroundColor: '#f7af02', color: '#023e55' }}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
