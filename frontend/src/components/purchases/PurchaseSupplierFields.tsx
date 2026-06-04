import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { ContactLookupField } from '@/components/shared/ContactLookupField'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { findCompanyById, isSupplierCompany } from '@/lib/company-lookup'
import { contactDisplayPhone } from '@/lib/contact-lookup'
import { shouldClearContactOnCompanyChange } from '@/lib/dependent-lookup'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'

export type PurchaseSupplierValues = {
  supplierId: string
  supplier: string
  supplierContactId: string
  supplierContact: string
  supplierEmail: string
  supplierPhone: string
}

type PurchaseSupplierFieldsProps = {
  values: PurchaseSupplierValues
  onChange: (patch: Partial<PurchaseSupplierValues>) => void
  disabled?: boolean
}

export function PurchaseSupplierFields({
  values,
  onChange,
  disabled = false,
}: PurchaseSupplierFieldsProps) {
  const { allCompanies } = useCompaniesRegistry()
  const { allContacts } = useContactsRegistry()

  const handleCompanyChange = (supplierId: string, company?: CompanyListItem) => {
    const linked = supplierId ? findCompanyById(allCompanies, supplierId) : undefined
    const name = company?.name ?? linked?.name ?? ''
    const patch: Partial<PurchaseSupplierValues> = {
      supplierId,
      supplier: name,
    }

    if (
      shouldClearContactOnCompanyChange(
        supplierId,
        values.supplierContactId,
        allContacts,
        name,
        allCompanies,
      )
    ) {
      patch.supplierContactId = ''
      patch.supplierContact = ''
      patch.supplierEmail = ''
      patch.supplierPhone = ''
    }

    onChange(patch)
  }

  const handleContactChange = (_contactId: string, contact?: ContactListItem) => {
    if (!contact) {
      onChange({
        supplierContactId: '',
        supplierContact: '',
        supplierEmail: '',
        supplierPhone: '',
      })
      return
    }
    onChange({
      supplierContactId: contact.id,
      supplierContact: contact.name,
      supplierEmail: contact.email,
      supplierPhone: contactDisplayPhone(contact),
    })
  }

  const hasContact = Boolean(values.supplierContactId.trim())

  return (
    <div className="space-y-4">
      <CompanyLookupField
        label="Proveedor"
        value={values.supplierId}
        disabled={disabled}
        filterCompany={isSupplierCompany}
        createInitialValues={{ lifecycle: 'Proveedor' }}
        searchPlaceholder="Buscar empresa proveedor…"
        helperText="Solo empresas con etapa Proveedor. Puedes crear una nueva con esa etapa."
        onChange={handleCompanyChange}
      />

      <ContactLookupField
        label="Contacto en proveedor"
        value={values.supplierContactId}
        contactName={values.supplierContact}
        companyId={values.supplierId || undefined}
        companyName={values.supplier}
        disabled={disabled || !values.supplierId}
        onChange={handleContactChange}
      />

      {hasContact ? (
        <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">
              {values.supplierEmail || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Teléfono</p>
            <p className="font-medium text-foreground">
              {values.supplierPhone || '—'}
            </p>
          </div>
        </div>
      ) : values.supplierId ? (
        <p className="text-xs text-muted-foreground">
          Selecciona un contacto vinculado al proveedor para completar email y teléfono.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Primero selecciona un proveedor para elegir su contacto.
        </p>
      )}
    </div>
  )
}
