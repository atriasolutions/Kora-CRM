import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { StockReceiptFormFields } from '@/components/stock-receipts/StockReceiptFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import { loadPurchaseDetail } from '@/lib/entity-detail-loaders'
import { validateStockReceiptForm } from '@/lib/stock-receipt-create'
import { stockReceiptFormValuesFromDetail } from '@/lib/stock-receipt-form'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'

type EditStockReceiptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: StockReceiptDetail | null
  onSubmit: (values: StockReceiptFormValues) => void
}

export function EditStockReceiptDialog({
  open,
  onOpenChange,
  receipt,
  onSubmit,
}: EditStockReceiptDialogProps) {
  const [form, setForm] = useState<StockReceiptFormValues | null>(null)

  useEffect(() => {
    if (!open || !receipt) return
    queueMicrotask(() => {
      const base = stockReceiptFormValuesFromDetail(receipt)
      setForm(base)
      if (!receipt.purchaseId) return
      void loadPurchaseDetail(receipt.purchaseId).then((detail) => {
        setForm((prev) =>
          prev
            ? {
                ...prev,
                purchaseLineItems: detail.lineItems,
              }
            : prev,
        )
      })
    })
  }, [open, receipt])

  const patch = (partial: Partial<StockReceiptFormValues>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    const validation = validateStockReceiptForm(form, {
      autoNumber: true,
      purchaseLineItems: form.purchaseLineItems,
      excludeReceiptId: receipt?.id,
    })
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar ingreso</DialogTitle>
          <DialogDescription>
            Modifica bodega, referencia, observaciones y líneas (productos y cantidades enteras
            positivas). Confirma el ingreso desde el detalle para sumar stock.
          </DialogDescription>
        </DialogHeader>
        {receipt?.status !== 'Borrador' ? (
          <p className="text-sm text-muted-foreground">
            Solo los ingresos en estado Borrador pueden modificarse.
          </p>
        ) : form ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <StockReceiptFormFields
              form={form}
              onChange={patch}
              numberReadOnly
              excludeReceiptId={receipt.id}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Cargando formulario…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
