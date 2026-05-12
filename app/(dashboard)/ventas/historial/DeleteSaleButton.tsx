'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteSale } from '@/lib/actions/sales'

interface Props {
  saleId: number
  saleTotal: number
}

export default function DeleteSaleButton({ saleId, saleTotal }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    if (!reason.trim()) {
      setError('Motivo requerido')
      return
    }
    startTransition(async () => {
      const result = await deleteSale(saleId, reason.trim())
      if (!result.success) {
        setError(result.error)
        return
      }
      setOpen(false)
      setReason('')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Eliminar venta"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: '#023e55' }}>Eliminar venta #{saleId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            Esta acción es permanente. Se restaurará el stock vendido, se borrarán los movimientos de caja relacionados (₡{saleTotal.toFixed(2)}) y se eliminará la venta junto con sus líneas. Queda registro en auditoría.
          </div>
          <div className="space-y-2">
            <Label htmlFor={`reason-${saleId}`}>Motivo *</Label>
            <Input
              id={`reason-${saleId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ej. Cliente devolvió todo y se anuló incorrectamente"
              disabled={pending}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              style={{ backgroundColor: '#dc2626', color: 'white' }}
              className="font-semibold"
            >
              {pending ? 'Eliminando...' : 'Eliminar venta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
