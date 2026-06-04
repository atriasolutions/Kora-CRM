import { Building2, UserRound } from 'lucide-react'

import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { ContactLookupField } from '@/components/shared/ContactLookupField'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { findCompanyById } from '@/lib/company-lookup'
import type { SaleCustomerKind, SaleCustomerValues } from '@/lib/sale-customer'
import { cn } from '@/lib/utils'

type SaleCustomerFieldsProps = {
  values: SaleCustomerValues
  onChange: (patch: Partial<SaleCustomerValues>) => void
  disabled?: boolean
}

const kindOptions: { id: SaleCustomerKind; label: string; hint: string; Icon: typeof UserRound }[] =
  [
    { id: 'contacto', label: 'Persona (B2C)', hint: 'Venta a contacto', Icon: UserRound },
    { id: 'empresa', label: 'Empresa (B2B)', hint: 'Venta a empresa', Icon: Building2 },
  ]

export function SaleCustomerFields({
  values,
  onChange,
  disabled = false,
}: SaleCustomerFieldsProps) {
  const { allCompanies } = useCompaniesRegistry()

  const setKind = (customerKind: SaleCustomerKind) => {
    if (customerKind === values.customerKind) return
    onChange({
      customerKind,
      contactId: '',
      contactName: '',
      companyId: '',
      companyName: '',
    })
  }

  const handleContactChange = (contactId: string, contact?: ContactListItem) => {
    if (!contact) {
      onChange({ contactId: '', contactName: '' })
      return
    }
    const patch: Partial<SaleCustomerValues> = {
      contactId,
      contactName: contact.name,
    }
    if (contact.companyId?.trim()) {
      const company = findCompanyById(allCompanies, contact.companyId)
      patch.companyId = contact.companyId
      patch.companyName = company?.name ?? contact.company
    }
    onChange(patch)
  }

  const handleCompanyChange = (companyId: string, company?: CompanyListItem) => {
    onChange({
      companyId,
      companyName: company?.name ?? '',
    })
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

      {values.customerKind === 'contacto' ? (
        <ContactLookupField
          label="Contacto cliente"
          value={values.contactId}
          contactName={values.contactName}
          onChange={handleContactChange}
          disabled={disabled}
        />
      ) : (
        <CompanyLookupField
          label="Empresa cliente"
          value={values.companyId}
          onChange={handleCompanyChange}
          disabled={disabled}
        />
      )}
    </div>
  )
}
