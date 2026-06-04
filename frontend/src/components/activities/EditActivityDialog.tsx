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
import type { ActivityDetail } from '@/data/activity-detail.mock'
import {
  activityDetailToCreateFormValues,
  applyCreateFormValuesToActivity,
  validateCreateActivityForm,
  type CreateActivityFormValues,
} from '@/lib/activity-create'

type EditActivityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ActivityDetail
  onSave: (updated: ActivityDetail) => void
}

export function EditActivityDialog({
  open,
  onOpenChange,
  activity,
  onSave,
}: EditActivityDialogProps) {
  const [form, setForm] = useState<CreateActivityFormValues>(() =>
    activityDetailToCreateFormValues(activity),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(activityDetailToCreateFormValues(activity))
      setSaving(false)
    })
  }, [open, activity])

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
    setSaving(true)
    const updated = applyCreateFormValuesToActivity(activity, form)
    onSave(updated)
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar actividad</DialogTitle>
          <DialogDescription>
            Modifica la programación, el vínculo CRM y la duración estimada de «{activity.title}».
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <ActivityFormFields
            form={form}
            onChange={patch}
            idPrefix="act-edit"
            statusLabel="Estado"
          />
          <DialogFooter>
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
