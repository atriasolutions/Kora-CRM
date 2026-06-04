import { useEffect, useState } from 'react'
import { apiActionErrorMessage } from '@/api/errors'
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
import {
  createDefaultContactFormValues,
  type CreateContactFormValues,
} from '@/lib/contact-create'
import {
  contactFormValuesToCreate,
  createToContactFormValues,
  validateContactFormValues,
  type ContactFormValues,
} from '@/lib/contact-form'

type CreateContactDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateContactFormValues>
  onSubmit: (values: CreateContactFormValues) => void | Promise<void>
}

function buildCreateContactForm(
  initialValues?: Partial<CreateContactFormValues>,
) {
  const defaults = createDefaultContactFormValues(initialValues)
  return createToContactFormValues({
    ...defaults,
    contactKind:
      defaults.companyId.trim() || defaults.company.trim() ? 'B2B' : 'B2C',
  })
}

export function CreateContactDialog({
  open,
  onOpenChange,
  title = 'Nuevo contacto',
  description = 'Completa la ficha del contacto. Los campos marcados son obligatorios.',
  initialValues,
  onSubmit,
}: CreateContactDialogProps) {
  const [form, setForm] = useState<ContactFormValues>(() =>
    buildCreateContactForm(initialValues),
  )
  const [showRutError, setShowRutError] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(buildCreateContactForm(initialValues))
      setShowRutError(false)
      setSaving(false)
    })
  }, [open, initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (form.contactKind === 'B2B' && !form.companyId.trim()) {
      toast.warning('Selecciona o crea una empresa para contactos B2B.')
      return
    }
    const normalized = {
      ...form,
      rut: contactFormValuesToCreate(form).rut,
    }
    const validation = validateContactFormValues(normalized)
    if (validation) {
      setShowRutError(true)
      toast.warning(validation)
      return
    }
    setShowRutError(false)
    setSaving(true)
    try {
      await onSubmit(contactFormValuesToCreate(normalized))
      onOpenChange(false)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo crear el contacto.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <ContactFormFields
            values={form}
            onChange={(next) => setForm(next)}
            showRutError={showRutError}
          />

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear contacto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
