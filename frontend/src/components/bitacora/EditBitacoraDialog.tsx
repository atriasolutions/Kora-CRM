import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { BitacoraFormFields } from '@/components/bitacora/BitacoraFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  bitacoraDetailToFormValues,
  validateBitacoraForm,
  type BitacoraFormValues,
} from '@/lib/bitacora-form'

type EditBitacoraDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: BitacoraListItem | null
  onSubmit: (values: BitacoraFormValues) => void | Promise<void>
}

export function EditBitacoraDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
}: EditBitacoraDialogProps) {
  const [form, setForm] = useState<BitacoraFormValues>(() =>
    entry ? bitacoraDetailToFormValues(entry) : bitacoraDetailToFormValues({
      id: '',
      solicitudId: '',
      solicitudCode: '',
      solicitudTitle: '',
      workDate: '',
      hours: 1,
      description: '',
      isBillable: true,
      nonBillableReason: null,
      assignedUserId: '',
      assignedUserName: '',
      createdAt: '',
      createdById: '',
      createdByName: '',
      updatedAt: '',
      updatedById: '',
      updatedByName: '',
    }),
  )

  useEffect(() => {
    if (!open || !entry) return
    queueMicrotask(() => {
      setForm(bitacoraDetailToFormValues(entry))
    })
  }, [open, entry])

  const patch = (partial: Partial<BitacoraFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateBitacoraForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    await onSubmit(form)
    onOpenChange(false)
  }

  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar bitácora</DialogTitle>
          <DialogDescription>
            Actualice las horas, fecha o descripción del registro.
          </DialogDescription>
        </DialogHeader>
        <form className="w-full min-w-0 space-y-4" onSubmit={handleSubmit}>
          <BitacoraFormFields form={form} onChange={patch} idPrefix="bitacora-edit" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
