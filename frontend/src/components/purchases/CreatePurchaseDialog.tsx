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
import { usePurchasesRegistry } from '@/hooks/use-purchases-registry'
import {
  createDefaultPurchaseFormValues,
  validatePurchaseForm,
  type PurchaseFormValues,
} from '@/lib/purchase-form'

type CreatePurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<PurchaseFormValues>
  onSubmit: (values: PurchaseFormValues) => void
}

export function CreatePurchaseDialog({
  open,
  onOpenChange,
  title = 'Nueva orden de compra',
  description = 'Registra la OC con proveedor, líneas y condiciones de entrega.',
  initialValues,
  onSubmit,
}: CreatePurchaseDialogProps) {
  const { allPurchases } = usePurchasesRegistry()
  const [form, setForm] = useState<PurchaseFormValues>(() =>
    createDefaultPurchaseFormValues(initialValues, {
      existingReferences: allPurchases.map((p) => p.reference),
    }),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(
        createDefaultPurchaseFormValues(initialValues, {
          existingReferences: allPurchases.map((p) => p.reference),
        }),
      )
      setSaving(false)
    })
  }, [open, initialValues, allPurchases])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validatePurchaseForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    onSubmit(form)
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PurchaseOrderFormFields
            form={form}
            idPrefix="create-pur"
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
              {saving ? 'Creando…' : 'Crear compra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
