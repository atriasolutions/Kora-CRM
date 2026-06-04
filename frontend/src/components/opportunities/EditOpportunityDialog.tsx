import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { OpportunityFormFields } from '@/components/opportunities/OpportunityFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import { validateCreateOpportunityForm } from '@/lib/opportunity-create'
import { resolveOpportunityCustomerKind } from '@/lib/opportunity-customer'
import {
  applyFormValuesToOpportunity,
  opportunityDetailToFormValues,
  type OpportunityFormValues,
} from '@/lib/opportunity-form'

type EditOpportunityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: OpportunityDetail
  onSave: (updated: OpportunityDetail) => void
}

export function EditOpportunityDialog({
  open,
  onOpenChange,
  opportunity,
  onSave,
}: EditOpportunityDialogProps) {
  const [form, setForm] = useState<OpportunityFormValues>(() =>
    opportunityDetailToFormValues(opportunity),
  )
  const [saving, setSaving] = useState(false)

  const companyPreset = useMemo(() => {
    if (resolveOpportunityCustomerKind(opportunity) !== 'empresa') return undefined
    const name = form.company.trim() || opportunity.company.trim()
    if (!name) return undefined
    return {
      id: form.companyId.trim() || opportunity.companyId?.trim() || '',
      name,
      logoUrl: '',
      industry: '',
      city: '',
    }
  }, [
    form.company,
    form.companyId,
    opportunity.company,
    opportunity.companyId,
    opportunity.customerKind,
  ])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(opportunityDetailToFormValues(opportunity))
      setSaving(false)
    })
  }, [open, opportunity])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateOpportunityForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    const updated = applyFormValuesToOpportunity(opportunity, form)
    onSave(updated)
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar oportunidad</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {opportunity.name}: datos comerciales, etapa y relaciones.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <ContactFormInput
            id="edit-opp-name"
            label="Nombre de la oportunidad"
            value={form.name}
            onChange={(name) => setForm((prev) => ({ ...prev, name }))}
          />
          <OpportunityFormFields
            idPrefix="edit-opp"
            values={form}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            presetCompany={companyPreset}
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
