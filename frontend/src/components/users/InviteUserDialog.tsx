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
import { useProfilesRegistry } from '@/hooks/use-profiles-registry'
import {
  createDefaultUserFormValues,
  resolveProfileIdForRole,
  validateUserFormValues,
  type UserFormValues,
} from '@/lib/user-form'
import { toast } from '@/lib/toast'

type InviteUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UserFormValues) => void | Promise<void>
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSubmit,
}: InviteUserDialogProps) {
  const { listItems: profileOptions } = useProfilesRegistry()
  const [form, setForm] = useState(() => createDefaultUserFormValues(undefined, []))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultUserFormValues(undefined, profileOptions))
      setSaving(false)
    })
  }, [open, profileOptions])

  useEffect(() => {
    if (!open || profileOptions.length === 0) return
    setForm((prev) => {
      const valid = profileOptions.some((p) => p.id === prev.profileId)
      if (valid) return prev
      return {
        ...prev,
        profileId: resolveProfileIdForRole(prev.role, profileOptions),
      }
    })
  }, [open, profileOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUserFormValues(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    try {
      await onSubmit({ ...form, status: 'Por verificar' })
      onOpenChange(false)
    } catch {
      /* UsersPage muestra el toast de error */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Completa la ficha del colaborador. Recibirá un correo de bienvenida y quedará
            en estado Por verificar hasta que active su cuenta.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <UserFormFields
            form={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            showStatus={false}
            defaultStatus="Por verificar"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enviando…' : 'Enviar invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
