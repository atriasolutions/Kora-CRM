import { useEffect, useRef, useState } from 'react'
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
import {
  createDefaultOpportunityFormValues,
  validateCreateOpportunityForm,
  type CreateOpportunityFormValues,
} from '@/lib/opportunity-create'
import { buildDefaultOpportunityName } from '@/lib/opportunity-metadata'
import type { CompanyListItem } from '@/data/companies.mock'

type CreateOpportunityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateOpportunityFormValues>
  presetCompany?: Pick<
    CompanyListItem,
    'id' | 'name' | 'logoUrl' | 'industry' | 'city'
  >
  onSubmit: (values: CreateOpportunityFormValues) => void
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
  title = 'Nueva oportunidad',
  description,
  initialValues,
  presetCompany,
  onSubmit,
}: CreateOpportunityDialogProps) {
  const [form, setForm] = useState(() => createDefaultOpportunityFormValues(initialValues))
  const nameTouchedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      const defaults = createDefaultOpportunityFormValues(initialValues)
      const hasCustomName = Boolean(initialValues?.name?.trim())
      nameTouchedRef.current = hasCustomName
      const name =
        initialValues?.name?.trim() ||
        buildDefaultOpportunityName({
          customerKind: defaults.customerKind,
          company: defaults.company,
          contactName: defaults.contactName,
        })
      setForm({ ...defaults, name })
    })
  }, [open, initialValues])

  const patch = (partial: Partial<CreateOpportunityFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const patchForm = (partial: Partial<CreateOpportunityFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial }
      if (!nameTouchedRef.current) {
        next.name = buildDefaultOpportunityName({
          customerKind: next.customerKind,
          company: next.company,
          contactName: next.contactName,
        })
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateOpportunityForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              'Registra el cliente, etapa y origen. El monto con IVA se actualiza al sincronizar una cotización.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <ContactFormInput
            id="opp-name"
            label="Nombre de la oportunidad"
            value={form.name}
            onChange={(name) => {
              nameTouchedRef.current = true
              patch({ name })
            }}
            placeholder="Cliente · 18 may 2026"
          />
          <OpportunityFormFields
            idPrefix="create-opp"
            values={form}
            onChange={patchForm}
            presetCompany={presetCompany}
          />
          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear oportunidad</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
