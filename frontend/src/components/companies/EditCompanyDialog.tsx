import { useEffect, useState } from 'react'
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
import type { CompanyDetail } from '@/data/company-detail.mock'
import {
  applyFormValuesToCompany,
  companyDetailToFormValues,
  validateCompanyFormValues,
  type CompanyFormValues,
} from '@/lib/company-form'

type EditCompanyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: CompanyDetail
  onSave: (updated: CompanyDetail) => void | Promise<void>
}

export function EditCompanyDialog({
  open,
  onOpenChange,
  company,
  onSave,
}: EditCompanyDialogProps) {
  const [form, setForm] = useState<CompanyFormValues>(() =>
    companyDetailToFormValues(company),
  )
  const [saving, setSaving] = useState(false)
  const [showIdentifierError, setShowIdentifierError] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(companyDetailToFormValues(company))
      setSaving(false)
      setShowIdentifierError(false)
    })
  }, [open, company])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCompanyFormValues(form, { excludeId: company.id })
    if (validation) {
      setShowIdentifierError(true)
      toast.warning(validation)
      return
    }
    setShowIdentifierError(false)
    setSaving(true)
    try {
      await onSave(applyFormValuesToCompany(company, form))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar empresa</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {company.name}: identificación, ubicación, contacto y
            responsable.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <CompanyFormFields
            values={form}
            onChange={setForm}
            showIdentifierError={showIdentifierError}
            idPrefix="edit-company"
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
