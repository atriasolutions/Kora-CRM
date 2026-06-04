import { useEffect, useState } from 'react'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'

import { CompanyFormFields } from '@/components/companies/CompanyFormFields'
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
  createDefaultCompanyFormValues,
  validateCompanyFormValues,
  type CompanyFormValues,
} from '@/lib/company-form'
import type { CreateCompanyFormValues } from '@/lib/company-create'

type CreateCompanyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  submitLabel?: string
  initialValues?: Partial<CreateCompanyFormValues>
  onSubmit: (values: CreateCompanyFormValues) => void | Promise<void>
}

export function CreateCompanyDialog({
  open,
  onOpenChange,
  title = 'Nueva empresa',
  description = 'Completa la ficha de la empresa: identificación, ubicación, contacto y responsable.',
  submitLabel = 'Crear empresa',
  initialValues,
  onSubmit,
}: CreateCompanyDialogProps) {
  const [form, setForm] = useState<CompanyFormValues>(() =>
    createDefaultCompanyFormValues(initialValues),
  )
  const [saving, setSaving] = useState(false)
  const [showIdentifierError, setShowIdentifierError] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultCompanyFormValues(initialValues))
      setSaving(false)
      setShowIdentifierError(false)
    })
  }, [open, initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const validation = validateCompanyFormValues(form)
    if (validation) {
      setShowIdentifierError(true)
      toast.warning(validation)
      return
    }
    setShowIdentifierError(false)
    setSaving(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo crear la empresa.'))
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
          <CompanyFormFields
            values={form}
            onChange={setForm}
            showIdentifierError={showIdentifierError}
            idPrefix="create-company"
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
              {saving ? 'Guardando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
