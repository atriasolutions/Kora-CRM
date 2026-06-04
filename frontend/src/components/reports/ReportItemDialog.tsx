import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
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
  createDefaultReportFormValues,
  validateReportForm,
  type ReportFormValues,
} from '@/lib/report-item-form'
import { UserLookupField } from '@/components/shared/UserLookupField'
import type { ReportFolder } from '@/types/reports-tree'

type ReportItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  folders: ReportFolder[]
  defaultFolderId: string
  initialValues?: Partial<ReportFormValues>
  onSubmit: (values: ReportFormValues) => void
}

export function ReportItemDialog({
  open,
  onOpenChange,
  mode,
  folders,
  defaultFolderId,
  initialValues,
  onSubmit,
}: ReportItemDialogProps) {
  const [form, setForm] = useState(() =>
    createDefaultReportFormValues(defaultFolderId, initialValues),
  )

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultReportFormValues(defaultFolderId, initialValues))
    })
  }, [open, defaultFolderId, initialValues])

  const patch = (partial: Partial<ReportFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateReportForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  const folderOptions = folders.map((f) => ({
    value: f.id,
    label: f.name,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo reporte' : 'Editar reporte'}</DialogTitle>
          <DialogDescription>
            Los reportes se generan como tabla dinámica con columnas y filtros configurables.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <ContactFormInput
            id="rpt-name"
            label="Nombre"
            value={form.name}
            onChange={(name) => patch({ name })}
          />
          <ContactFormSelect
            id="rpt-folder"
            label="Carpeta"
            value={form.folderId}
            onChange={(folderId) => patch({ folderId })}
            options={folderOptions}
          />
          <ContactFormInput
            id="rpt-type"
            label="Etiqueta / categoría"
            value={form.reportType}
            onChange={(reportType) => patch({ reportType })}
          />
          <UserLookupField
            label="Autor"
            value={form.author}
            onChange={(author) => patch({ author })}
          />
          <ContactFormField id="rpt-desc" label="Descripción">
            <textarea
              id="rpt-desc"
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </ContactFormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{mode === 'create' ? 'Crear' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
