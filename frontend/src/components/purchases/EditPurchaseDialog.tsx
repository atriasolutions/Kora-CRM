import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { PurchaseOrderFormFields } from '@/components/purchases/PurchaseOrderFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import {
  applyFormValuesToPurchase,
  purchaseDetailToFormValues,
  validatePurchaseForm,
  type PurchaseFormValues,
} from '@/lib/purchase-form'

type EditPurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: PurchaseDetail
  onSave: (updated: PurchaseDetail) => void | Promise<void>
}

export function EditPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  onSave,
}: EditPurchaseDialogProps) {
  const [form, setForm] = useState<PurchaseFormValues>(() =>
    purchaseDetailToFormValues(purchase),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(purchaseDetailToFormValues(purchase))
      setSaving(false)
    })
  }, [open, purchase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validatePurchaseForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    try {
      const updated = applyFormValuesToPurchase(purchase, form)
      await onSave(updated)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo guardar la orden de compra.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar orden de compra</DialogTitle>
          <DialogDescription>
            Modifica la orden de {purchase.supplier}: líneas, logística y estado.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PurchaseOrderFormFields
            form={form}
            idPrefix="edit-pur"
            onChange={(patch) => {
              setForm((prev) => ({ ...prev, ...patch }))
            }}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
