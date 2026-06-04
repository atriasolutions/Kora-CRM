import { Building2, HelpCircle, UserRound } from 'lucide-react'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { ContactLookupField } from '@/components/shared/ContactLookupField'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import {
  emptyContactLookupFields,
  shouldClearContactOnCompanyChange,
} from '@/lib/dependent-lookup'
import {
  projectCustomerPatchFromContact,
  resolveProjectClientName,
  type ProjectCustomerKind,
  type ProjectCustomerSlice,
} from '@/lib/project-customer'
import { cn } from '@/lib/utils'

type ProjectCustomerFieldsProps = {
  values: ProjectCustomerSlice
  onChange: (patch: Partial<ProjectCustomerSlice>) => void
  disabled?: boolean
  idPrefix?: string
}

const kindOptions: {
  id: ProjectCustomerKind
  label: string
  hint: string
  Icon: typeof UserRound
}[] = [
  {
    id: '',
    label: 'Sin especificar',
    hint: 'Nombre de cliente en texto libre',
    Icon: HelpCircle,
  },
  { id: 'contacto', label: 'Persona (B2C)', hint: 'Proyecto para un contacto', Icon: UserRound },
  { id: 'empresa', label: 'Empresa (B2B)', hint: 'Proyecto para una empresa', Icon: Building2 },
]

export function ProjectCustomerFields({
  values,
  onChange,
  disabled = false,
  idPrefix = 'pr-cust',
}: ProjectCustomerFieldsProps) {
  const { allContacts } = useContactsRegistry()
  const { allCompanies } = useCompaniesRegistry()

  const setKind = (customerKind: ProjectCustomerKind) => {
    if (customerKind === values.customerKind) return
    onChange({
      customerKind,
      companyId: '',
      company: '',
      contactId: '',
      contactName: '',
      client: customerKind ? '' : values.client,
    })
  }

  const handleCompanyChange = (companyId: string, company?: CompanyListItem) => {
    const companyName = company?.name ?? ''
    const patch: Partial<ProjectCustomerSlice> = {
      companyId,
      company: companyName,
      client: companyName,
    }
    if (
      shouldClearContactOnCompanyChange(
        companyId,
        values.contactId,
        allContacts,
        companyName || values.company,
        allCompanies,
      )
    ) {
      Object.assign(patch, emptyContactLookupFields())
      patch.contactName = ''
    }
    onChange(patch)
  }

  const handleContactChange = (_contactId: string, contact?: ContactListItem) => {
    if (!contact) {
      onChange({
        contactId: '',
        contactName: '',
        client: '',
      })
      return
    }
    const patch = projectCustomerPatchFromContact(contact, allCompanies)
    onChange({
      ...patch,
      client: resolveProjectClientName({ ...values, ...patch }),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Tipo de cliente <span className="font-normal">(opcional)</span>
        </p>
        <div
          className="grid gap-2 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Tipo de cliente del proyecto"
        >
          {kindOptions.map(({ id, label, hint, Icon }) => {
            const active = values.customerKind === id
            return (
              <button
                key={id || 'none'}
                type="button"
                disabled={disabled}
                onClick={() => setKind(id)}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border hover:border-primary/30 hover:bg-muted/40',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-md',
                    active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {hint}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {!values.customerKind ? (
        <ContactFormInput
          id={`${idPrefix}-client-text`}
          label="Nombre del cliente"
          inputVariant="alphanumeric"
          value={values.client}
          onChange={(client) => onChange({ client })}
          disabled={disabled}
          placeholder="Ej. Acme Corp o Juan Pérez"
        />
      ) : null}

      {values.customerKind === 'empresa' ? (
        <>
          <CompanyLookupField
            label="Empresa cliente"
            value={values.companyId}
            onChange={handleCompanyChange}
            disabled={disabled}
          />
          <ContactLookupField
            label="Contacto de referencia (opcional)"
            value={values.contactId}
            contactName={values.contactName}
            onChange={handleContactChange}
            companyId={values.companyId}
            companyName={values.company}
            disabled={disabled || !values.companyId.trim()}
          />
        </>
      ) : null}

      {values.customerKind === 'contacto' ? (
        <ContactLookupField
          label="Contacto cliente"
          value={values.contactId}
          contactName={values.contactName}
          onChange={handleContactChange}
          disabled={disabled}
        />
      ) : null}
    </div>
  )
}
