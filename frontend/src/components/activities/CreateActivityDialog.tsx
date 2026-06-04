import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ActivityFormFields } from '@/components/activities/ActivityFormFields'
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
  createDefaultActivityFormValues,
  validateCreateActivityForm,
  type CreateActivityFormValues,
} from '@/lib/activity-create'

type CreateActivityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateActivityFormValues>
  onSubmit: (values: CreateActivityFormValues) => void
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  title = 'Nueva actividad',
  description,
  initialValues,
  onSubmit,
}: CreateActivityDialogProps) {
  const [form, setForm] = useState(() => createDefaultActivityFormValues(initialValues))

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultActivityFormValues(initialValues))
    })
  }, [open, initialValues])

  const patch = (partial: Partial<CreateActivityFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateActivityForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? 'Programa una tarea, llamada o reunión vinculada al CRM.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <ActivityFormFields form={form} onChange={patch} idPrefix="act-create" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear actividad</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
