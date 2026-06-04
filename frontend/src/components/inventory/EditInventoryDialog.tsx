import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { InventoryDetailSidebar } from '@/components/inventory/InventoryDetailSidebar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import {
  applyFormValuesToInventory,
  inventoryDetailToFormValues,
  type InventoryFormValues,
} from '@/lib/inventory-form'

type EditInventoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventory: InventoryDetail
  onSave: (updated: InventoryDetail) => void
}

export function EditInventoryDialog({
  open,
  onOpenChange,
  inventory,
  onSave,
}: EditInventoryDialogProps) {
  const [form, setForm] = useState<InventoryFormValues>(() =>
    inventoryDetailToFormValues(inventory),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(inventoryDetailToFormValues(inventory))
      setSaving(false)
    })
  }, [open, inventory])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.productName.trim()) {
      toast.warning('El nombre del producto es obligatorio.')
      return
    }
    setSaving(true)
    const updated = applyFormValuesToInventory(inventory, form)
    onSave(updated)
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar inventario</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {inventory.productName}: existencias, ubicación y responsable.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <ContactFormInput
            id="edit-inv-sku"
            label="SKU"
            value={form.sku}
            onChange={(sku) => setForm((prev) => ({ ...prev, sku }))}
          />
          <InventoryDetailSidebar
            inventory={inventory}
            isEditing
            form={form}
            onFormChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
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
