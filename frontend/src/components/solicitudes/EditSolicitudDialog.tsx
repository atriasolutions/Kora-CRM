import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { SolicitudFormFields } from '@/components/solicitudes/SolicitudFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiActionErrorMessage } from '@/api/errors'
import { getCurrentUserName } from '@/lib/current-user'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import {
  persistSolicitudDescriptionMedia,
} from '@/lib/solicitud-description-media'
import type { SolicitudFile } from '@/lib/solicitud-files'
import { persistSolicitudFiles } from '@/lib/solicitud-files'
import {
  applyFormValuesToSolicitud,
  solicitudDetailToFormValues,
  validateSolicitudForm,
  type SolicitudFormValues,
} from '@/lib/solicitud-form'

type EditSolicitudDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitud: SolicitudDetail
  onSave: (updated: SolicitudDetail) => void | Promise<void>
}

export function EditSolicitudDialog({
  open,
  onOpenChange,
  solicitud,
  onSave,
}: EditSolicitudDialogProps) {
  const [form, setForm] = useState<SolicitudFormValues>(() =>
    solicitudDetailToFormValues(solicitud),
  )
  const [descriptionFiles, setDescriptionFiles] = useState<SolicitudFile[]>(
    () => solicitud.files ?? [],
  )
  const [editorKey, setEditorKey] = useState(0)
  const [saving, setSaving] = useState(false)

  const authorName =
    getCurrentUserName() ||
    solicitud.assignee?.trim() ||
    solicitud.createdByName?.trim() ||
    'Usuario'

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(solicitudDetailToFormValues(solicitud))
      setDescriptionFiles(solicitud.files ?? [])
      setEditorKey((k) => k + 1)
      setSaving(false)
    })
  }, [open, solicitud])

  const patch = (partial: Partial<SolicitudFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateSolicitudForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    try {
      const { description: remappedDescription, files: savedFiles } =
        await persistSolicitudDescriptionMedia(
          solicitud.id,
          form.title.trim() || solicitud.title,
          form.description,
          descriptionFiles,
          persistSolicitudFiles,
        )
      const updated = applyFormValuesToSolicitud(solicitud, {
        ...form,
        description: remappedDescription,
      })
      await onSave({ ...updated, files: savedFiles })
      onOpenChange(false)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo guardar la solicitud.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar solicitud</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {solicitud.title} ({solicitud.code}).
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <SolicitudFormFields
            values={form}
            onChange={patch}
            descriptionFiles={descriptionFiles}
            onDescriptionFilesChange={setDescriptionFiles}
            descriptionAuthorName={authorName}
            editorKey={`edit-${solicitud.id}-${editorKey}`}
            idPrefix="edit-sol"
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
