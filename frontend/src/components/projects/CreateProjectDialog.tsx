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
import {
  createDefaultProjectFormValues,
  validateCreateProjectForm,
  type CreateProjectFormValues,
} from '@/lib/project-create'

type CreateProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateProjectFormValues>
  onSubmit: (values: CreateProjectFormValues) => void
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  title = 'Nuevo proyecto',
  description,
  initialValues,
  onSubmit,
}: CreateProjectDialogProps) {
  const [form, setForm] = useState(() => createDefaultProjectFormValues(initialValues))

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultProjectFormValues(initialValues))
    })
  }, [open, initialValues])

  const patch = (partial: Partial<CreateProjectFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateProjectForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? 'Define el alcance, cliente y fechas del proyecto.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <ProjectFormFields
            values={form}
            onChange={patch}
            idPrefix="create-pr"
            progressLabel="Avance inicial"
          />
          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear proyecto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
