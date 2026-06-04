import { getAllKnownCompanies } from '@/data/companies-registry-store'
import type { ContactListItem } from '@/data/contacts.mock'
import { contactBelongsToCompany } from '@/lib/contact-lookup'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { resolveCanonicalCompanyId } from '@/lib/company-lookup'
import type { CreateContactFormValues } from '@/lib/contact-create'

export type CompanyContactLookup = {
  id: string
  name: string
}

/** Contactos vinculados a la empresa (por companyId o nombre denormalizado). */
export function contactsForCompany(
  contacts: ContactListItem[],
  company: CompanyContactLookup,
): ContactListItem[] {
  const companyName = company.name.trim()
  const companyId = company.id.trim()

  const companies = getAllKnownCompanies()
  return contacts
    .filter((contact) =>
      contactBelongsToCompany(contact, companyId, companyName, companies),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function createContactInitialFromCompany(company: {
  id: string
  name: string
  owner?: string
  ownerDetail?: { name: string }
}): Partial<CreateContactFormValues> {
  const ownerName =
    company.ownerDetail?.name?.trim() ||
    company.owner?.trim() ||
    getDefaultOwnerName() ||
    'María López'

  const companyName = company.name.trim()
  const companyId = resolveCanonicalCompanyId(getAllKnownCompanies(), {
    id: company.id,
    name: companyName,
  })

  return {
    companyId,
    company: companyName,
    ownerName,
    status: 'Prospecto',
  }
}
