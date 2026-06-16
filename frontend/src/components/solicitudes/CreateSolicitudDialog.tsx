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
import { useAuth } from '@/hooks/use-auth'
import { isGuestAccessProfile } from '@/lib/access-profile-admin'
import { getCurrentUserName } from '@/lib/current-user'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { resolveDefaultSolicitudAssignee } from '@/lib/organization-settings'
import type { SolicitudFile } from '@/lib/solicitud-files'
import {
  createDefaultSolicitudFormValues,
  validateCreateSolicitudForm,
  type CreateSolicitudFormValues,
} from '@/lib/solicitud-create'

export type CreateSolicitudPayload = {
  values: CreateSolicitudFormValues
  descriptionFiles: SolicitudFile[]
}

type CreateSolicitudDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<CreateSolicitudFormValues>
  onSubmit: (payload: CreateSolicitudPayload) => void
}

export function CreateSolicitudDialog({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
}: CreateSolicitudDialogProps) {
  const { session, profile } = useAuth()
  const showRequesterField = !isGuestAccessProfile(profile)
  const { settings } = useOrganizationSettings()
  const { allUsers } = useUsersRegistry()
  const [form, setForm] = useState(() => createDefaultSolicitudFormValues(initialValues))
  const [descriptionFiles, setDescriptionFiles] = useState<SolicitudFile[]>([])
  const [editorKey, setEditorKey] = useState(0)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      const defaultAssignee = resolveDefaultSolicitudAssignee(settings, allUsers)
      setForm(
        createDefaultSolicitudFormValues({
          assigneeName: defaultAssignee.assigneeName,
          assigneeUserId: defaultAssignee.assigneeUserId,
          ...initialValues,
        }),
      )
      setDescriptionFiles([])
      setEditorKey((k) => k + 1)
    })
  }, [open, initialValues, settings, allUsers])

  const patch = (partial: Partial<CreateSolicitudFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateSolicitudForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit({ values: form, descriptionFiles })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>
            Registra la petición con texto e imágenes. Las evidencias se guardan en Archivos.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <SolicitudFormFields
            values={form}
            onChange={patch}
            descriptionFiles={descriptionFiles}
            onDescriptionFilesChange={setDescriptionFiles}
            descriptionAuthorName={session?.name?.trim() || getCurrentUserName()}
            editorKey={`create-${editorKey}`}
            idPrefix="create-sol"
            showRequesterField={showRequesterField}
          />
          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear solicitud</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
