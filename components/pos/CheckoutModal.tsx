'use client'

import { useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { createSale, type PaymentMethod, type PaymentInfo } from '@/lib/actions/sales'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ShoppingCart, CheckCircle2 } from 'lucide-react'
import type { Promotion } from '@/lib/actions/promotions'

interface CheckoutModalProps {
  promotions?: Promotion[]
}

export default function CheckoutModal({ promotions = [] }: CheckoutModalProps) {
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const discountedTotal = useCartStore((s) => s.discountedTotal)
  const getAppliedDiscounts = useCartStore((s) => s.getAppliedDiscounts)
  const clearCart = useCartStore((s) => s.clearCart)
  const finalTotal = discountedTotal(promotions)
  const rawTotal = total()
  const discounts = getAppliedDiscounts(promotions)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  const [cashAmount, setCashAmount] = useState('')
  const [sinpeAmount, setSinpeAmount] = useState('')
  const [referenceCode, setReferenceCode] = useState('')

  function buildPayment(): PaymentInfo {
    if (method === 'sinpe') {
      return { method, sinpeAmount: finalTotal, referenceCode: referenceCode.trim() }
    }
    if (method === 'mixto') {
      return {
        method,
        cashAmount: Number(cashAmount) || 0,
        sinpeAmount: Number(sinpeAmount) || 0,
        referenceCode: referenceCode.trim() || undefined,
      }
    }
    return { method: 'efectivo', cashAmount: finalTotal }
  }

  async function handleConfirm() {
    setLoading(true)
    setError('')
    const result = await createSale(items, null, buildPayment())
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setDone(true)
    clearCart()
  }

  function resetPayment() {
    setMethod('efectivo')
    setCashAmount('')
    setSinpeAmount('')
    setReferenceCode('')
  }

  function handleClose() {
    setOpen(false)
    setDone(false)
    setError('')
    resetPayment()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setDone(false)
          setError('')
          resetPayment()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="w-full h-14 text-lg font-bold rounded-xl shadow-md hover:opacity-90"
          style={{ backgroundColor: '#f7af02', color: '#023e55' }}
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Cobrar ₡{finalTotal.toFixed(2)}
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
              {discounts.length > 0 && (
                <>
                  <div className="pt-2" style={{ borderTop: '1px solid #d0dde2' }}>
                    {discounts.map((d) => (
                      <div key={d.promotionId} className="flex justify-between text-sm text-green-700">
                        <span className="truncate flex-1 mr-2">🏷 {d.promotionName}</span>
                        <span className="font-semibold shrink-0">-₡{d.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>₡{rawTotal.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTop: '1px solid #d0dde2' }}>
                <span style={{ color: '#023e55' }}>Total</span>
                <span style={{ color: '#023e55' }}>₡{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Método de pago</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="sinpe">SINPE</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>

              {method === 'sinpe' && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-600">Código de referencia</label>
                  <input
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    placeholder="Ref. SINPE"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              )}

              {method === 'mixto' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-600">Efectivo</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-600">SINPE</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sinpeAmount}
                      onChange={(e) => setSinpeAmount(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-600">Ref. SINPE (opcional)</label>
                    <input
                      type="text"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              )}
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
