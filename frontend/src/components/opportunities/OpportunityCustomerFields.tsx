import { Building2, UserRound } from 'lucide-react'
import { useMemo } from 'react'

import {
  ContactFormInput,
} from '@/components/contacts/ContactFormField'
import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { ContactLookupField } from '@/components/shared/ContactLookupField'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import {
  emptyContactLookupFields,
  shouldClearContactOnCompanyChange,
} from '@/lib/dependent-lookup'
import {
  opportunityCustomerPatchFromContact,
  type OpportunityCustomerKind,
  type OpportunityCustomerValues,
} from '@/lib/opportunity-customer'
import { cn } from '@/lib/utils'

export type OpportunityCustomerFieldsValues = OpportunityCustomerValues & {
  contactEmail: string
  contactPhone: string
}

type OpportunityCustomerFieldsProps = {
  values: OpportunityCustomerFieldsValues
  onChange: (patch: Partial<OpportunityCustomerFieldsValues>) => void
  disabled?: boolean
  showContactChannels?: boolean
  presetCompany?: Pick<
    CompanyListItem,
    'id' | 'name' | 'logoUrl' | 'industry' | 'city'
  >
}

const kindOptions: {
  id: OpportunityCustomerKind
  label: string
  hint: string
  Icon: typeof UserRound
}[] = [
  { id: 'contacto', label: 'Persona (B2C)', hint: 'Venta a contacto', Icon: UserRound },
  { id: 'empresa', label: 'Empresa (B2B)', hint: 'Venta a empresa', Icon: Building2 },
]

export function OpportunityCustomerFields({
  values,
  onChange,
  disabled = false,
  showContactChannels = false,
  presetCompany,
}: OpportunityCustomerFieldsProps) {
  const { allContacts } = useContactsRegistry()
  const { allCompanies } = useCompaniesRegistry()

  const effectivePreset = useMemo(() => {
    if (values.customerKind !== 'empresa') return undefined
    const name = values.company.trim() || presetCompany?.name?.trim() || ''
    if (!name) return undefined
    return {
      id: values.companyId.trim() || presetCompany?.id?.trim() || '',
      name,
      logoUrl: presetCompany?.logoUrl ?? '',
      industry: presetCompany?.industry ?? '',
      city: presetCompany?.city ?? '',
    }
  }, [
    presetCompany?.city,
    presetCompany?.id,
    presetCompany?.industry,
    presetCompany?.logoUrl,
    presetCompany?.name,
    values.company,
    values.companyId,
    values.customerKind,
  ])

  const hasCompanyScope = Boolean(
    values.companyId.trim() || values.company.trim() || effectivePreset?.name,
  )

  const effectivePresetContact = useMemo(() => {
    const name =
      values.contactName.trim() && values.contactName !== '—'
        ? values.contactName.trim()
        : ''
    const id = values.contactId.trim()
    const email = values.contactEmail.trim()
    if (!name && !id && !email) return undefined
    return {
      id,
      name: name || email.split('@')[0] || 'Contacto vinculado',
      email: values.contactEmail,
      company: values.company.trim() || effectivePreset?.name || '',
      companyId: values.companyId.trim() || effectivePreset?.id || '',
      avatarUrl: '',
      role: '',
    }
  }, [
    effectivePreset?.id,
    effectivePreset?.name,
    values.company,
    values.companyId,
    values.contactEmail,
    values.contactId,
    values.contactName,
  ])

  const setKind = (customerKind: OpportunityCustomerKind) => {
    if (customerKind === values.customerKind) return
    onChange({
      customerKind,
      companyId: '',
      company: '',
      contactId: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    })
  }

  const handleCompanyChange = (companyId: string, company?: CompanyListItem) => {
    const companyName = company?.name ?? ''
    const patch: Partial<OpportunityCustomerFieldsValues> = {
      companyId,
      company: companyName,
    }

    if (
      shouldClearContactOnCompanyChange(
        companyId,
        values.contactId,
        allContacts,
        companyName || values.company || presetCompany?.name,
        allCompanies,
      )
    ) {
      Object.assign(patch, emptyContactLookupFields())
    }

    onChange(patch)
  }

  const handleContactChange = (_contactId: string, contact?: ContactListItem) => {
    if (!contact) {
      onChange({
        contactId: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
      })
      return
    }

    onChange(opportunityCustomerPatchFromContact(contact, allCompanies))
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Tipo de cliente</p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de cliente">
          {kindOptions.map(({ id, label, hint, Icon }) => {
            const active = values.customerKind === id
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => setKind(id)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/40',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-md',
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {values.customerKind === 'empresa' ? (
        <>
          <CompanyLookupField
            label="Empresa cliente"
            value={values.companyId}
            onChange={handleCompanyChange}
            disabled={disabled}
            presetCompany={effectivePreset}
          />
          <ContactLookupField
            label="Contacto en la empresa"
            value={values.contactId}
            contactName={values.contactName}
            onChange={handleContactChange}
            companyId={values.companyId}
            companyName={values.company || effectivePreset?.name}
            presetContact={effectivePresetContact}
            disabled={disabled || !hasCompanyScope}
          />
          {!hasCompanyScope ? (
            <p className="text-xs text-muted-foreground">
              Selecciona primero la empresa para ver sus contactos.
            </p>
          ) : null}
        </>
      ) : (
        <ContactLookupField
          label="Contacto cliente"
          value={values.contactId}
          contactName={values.contactName}
          onChange={handleContactChange}
          disabled={disabled}
        />
      )}

      {showContactChannels ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormInput
            id="opp-contact-email"
            label="Email contacto"
            inputVariant="email"
            value={values.contactEmail}
            onChange={(contactEmail) => onChange({ contactEmail })}
            disabled={disabled}
          />
          <ContactFormInput
            id="opp-contact-phone"
            label="Teléfono contacto"
            inputVariant="phone"
            value={values.contactPhone}
            onChange={(contactPhone) => onChange({ contactPhone })}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  )
}
