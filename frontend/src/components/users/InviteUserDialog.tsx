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
import {
  createDefaultUserFormValues,
  validateUserFormValues,
  type UserFormValues,
} from '@/lib/user-form'
import { toast } from '@/lib/toast'

type InviteUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UserFormValues) => void
}

export function InviteUserDialog({
  open,
  onOpenChange,
  onSubmit,
}: InviteUserDialogProps) {
  const [form, setForm] = useState(() => createDefaultUserFormValues())

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultUserFormValues())
    })
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateUserFormValues(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit({ ...form, status: 'Por verificar' })
    onOpenChange(false)
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
            <Button type="submit">Enviar invitación</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
