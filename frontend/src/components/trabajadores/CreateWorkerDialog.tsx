import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { WorkerFormFields } from '@/components/trabajadores/WorkerFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createDefaultWorkerFormValues,
  validateWorkerForm,
  type WorkerFormValues,
} from '@/lib/worker-form'

type CreateWorkerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WorkerFormValues) => void
}

export function CreateWorkerDialog({ open, onOpenChange, onSubmit }: CreateWorkerDialogProps) {
  const [form, setForm] = useState(() => createDefaultWorkerFormValues())

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setForm(createDefaultWorkerFormValues()))
  }, [open])

  const patch = (partial: Partial<WorkerFormValues>) =>
    setForm((prev) => ({ ...prev, ...partial }))

  const handleSubmit = () => {
    const error = validateWorkerForm(form)
    if (error) {
      toast.error(error)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo trabajador</DialogTitle>
          <DialogDescription>Crea la ficha de un miembro del equipo.</DialogDescription>
        </DialogHeader>

        <WorkerFormFields form={form} patch={patch} />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Crear trabajador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
