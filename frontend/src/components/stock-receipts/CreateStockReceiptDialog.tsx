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
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import { validateStockReceiptForm } from '@/lib/stock-receipt-create'
import {
  createDefaultStockReceiptFormValues,
  type StockReceiptFormValues,
} from '@/lib/stock-receipt-form'

type CreateStockReceiptDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<StockReceiptFormValues>
  lockPurchase?: boolean
  title?: string
  description?: string
  existingNumbers?: string[]
  /** Líneas OC cuando el ingreso se abre desde el detalle de compra. */
  purchaseLineItems?: PurchaseLineItem[]
  onSubmit: (values: StockReceiptFormValues) => void
}

export function CreateStockReceiptDialog({
  open,
  onOpenChange,
  initialValues,
  lockPurchase = false,
  title = 'Nuevo ingreso de stock',
  description = 'Registra productos que ingresan a bodega. El número ING- se asignará al guardar; el stock se sumará al confirmar el ingreso.',
  existingNumbers = [],
  purchaseLineItems,
  onSubmit,
}: CreateStockReceiptDialogProps) {
  const [form, setForm] = useState(() =>
    createDefaultStockReceiptFormValues(initialValues, {
      existingNumbers,
    }),
  )

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(
        createDefaultStockReceiptFormValues(initialValues, { existingNumbers }),
      )
    })
  }, [open, initialValues, existingNumbers])

  const patch = (partial: Partial<StockReceiptFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateStockReceiptForm(form, {
      autoNumber: true,
      purchaseLineItems: purchaseLineItems ?? form.purchaseLineItems,
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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <StockReceiptFormFields
            form={form}
            onChange={patch}
            lockPurchase={lockPurchase}
            showReceiptNumber={false}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar borrador</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
