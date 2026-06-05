import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ProjectFormFields } from '@/components/projects/ProjectFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProjectDetail } from '@/data/project-detail.mock'
import {
  applyFormValuesToProject,
  projectDetailToFormValues,
  validateProjectForm,
  type ProjectFormValues,
} from '@/lib/project-form'

type EditProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  onSave: (updated: ProjectDetail) => void
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: EditProjectDialogProps) {
  const [form, setForm] = useState<ProjectFormValues>(() =>
    projectDetailToFormValues(project),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(projectDetailToFormValues(project))
      setSaving(false)
    })
  }, [open, project])

  const patch = (partial: Partial<ProjectFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.warning('El nombre del proyecto es obligatorio.')
      return
    }
    if (!form.deadline.trim()) {
      toast.warning('La fecha de entrega es obligatoria.')
      return
    }
    const validation = validateProjectForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    const updated = applyFormValuesToProject(project, form)
    onSave(updated)
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar proyecto</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {project.name}: alcance, cliente, fechas y relaciones.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <ProjectFormFields
            values={form}
            onChange={patch}
            idPrefix="edit-pr"
            disabled={saving}
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
