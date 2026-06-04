import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormFields } from '@/components/contacts/ContactFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContactDetail } from '@/data/contact-detail.mock'
import {
  applyFormValuesToContact,
  contactDetailToFormValues,
  validateContactFormValues,
  type ContactFormValues,
} from '@/lib/contact-form'
import { normalizeTaxIdValue } from '@/lib/tax-identifier'

type EditContactDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactDetail
  onSave: (updated: ContactDetail) => void | Promise<void>
}

export function EditContactDialog({
  open,
  onOpenChange,
  contact,
  onSave,
}: EditContactDialogProps) {
  const [form, setForm] = useState<ContactFormValues>(() =>
    contactDetailToFormValues(contact),
  )
  const [showRutError, setShowRutError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(contactDetailToFormValues(contact))
      setShowRutError(false)
      setSaving(false)
    })
  }, [open, contact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const values = {
      ...form,
      rut: normalizeTaxIdValue(form.identifierType, form.rut),
    }
    const validation = validateContactFormValues(values, { excludeId: contact.id })
    if (validation) {
      setShowRutError(true)
      toast.warning(validation)
      return
    }
    setShowRutError(false)
    setSaving(true)
    try {
      await onSave(applyFormValuesToContact(contact, values))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {contact.name}: datos personales, empresa, ubicación y
            responsable.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <ContactFormFields
            values={form}
            onChange={setForm}
            showRutError={showRutError}
            idPrefix="edit-contact"
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
