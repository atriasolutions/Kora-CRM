import { useEffect, useState } from 'react'

import { ProfilePermissionsEditor } from '@/components/profiles/ProfilePermissionsEditor'
import {
  ContactFormInput,
  ContactFormTextarea,
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
import { useProfilePermissionGrants } from '@/hooks/use-profile-permission-grants'
import {
  clampPermissionsToGrant,
  createEmptyGrantablePermissions,
} from '@/lib/profile-permission-grants'
import { toast } from '@/lib/toast'
import type { AccessProfile } from '@/types/access-profile'

type CreateProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (profile: Omit<AccessProfile, 'id' | 'userCount' | 'updatedAt'>) => void
}

export function CreateProfileDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateProfileDialogProps) {
  const { ceiling } = useProfilePermissionGrants()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState(() =>
    createEmptyGrantablePermissions(ceiling),
  )

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setName('')
      setDescription('')
      setPermissions(createEmptyGrantablePermissions(ceiling))
    })
  }, [open, ceiling])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.warning('Indica un nombre para el perfil.')
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      permissions: clampPermissionsToGrant(permissions, ceiling),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo perfil de acceso</DialogTitle>
          <DialogDescription>
            Define qué menús ve el usuario y qué puede visualizar, crear, editar o
            eliminar en cada módulo.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="profile-name"
              label="Nombre del perfil"
              inputVariant="alphanumeric"
              value={name}
              onChange={setName}
              required
            />
            <ContactFormTextarea
              id="profile-desc"
              label="Descripción"
              value={description}
              onChange={setDescription}
              rows={2}
              className="sm:col-span-2"
            />
          </div>
          <ProfilePermissionsEditor
            permissions={permissions}
            onChange={setPermissions}
            grantCeiling={ceiling}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear perfil</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
