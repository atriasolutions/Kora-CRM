import { useEffect, useState } from 'react'

import { UserFormFields } from '@/components/users/UserFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UserDetail } from '@/data/user-detail.mock'
import {
  applyFormValuesToUser,
  userDetailToFormValues,
  validateUserFormValues,
  type UserFormValues,
} from '@/lib/user-form'
import { toast } from '@/lib/toast'

type EditUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserDetail
  onSave: (updated: UserDetail) => void | Promise<void>
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: EditUserDialogProps) {
  const [form, setForm] = useState<UserFormValues>(() => userDetailToFormValues(user))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(userDetailToFormValues(user))
      setSaving(false)
    })
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUserFormValues(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    try {
      await onSave(applyFormValuesToUser(user, form))
      onOpenChange(false)
    } catch {
      /* El detalle muestra el error vía toast */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Mismos datos que ves en la ficha: perfil, preferencias, acceso y foto.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <UserFormFields form={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
