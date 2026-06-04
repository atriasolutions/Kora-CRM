import { getAllKnownCompanies } from '@/data/companies-registry-store'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { resolveCompanyIdFromName } from '@/lib/company-lookup'
import { resolveContactIdForLookup } from '@/lib/contact-lookup'
import { opportunityCustomerPatchFromContact } from '@/lib/opportunity-customer'
import type { CreateOpportunityFormValues } from '@/lib/opportunity-create'
import { buildDefaultOpportunityName } from '@/lib/opportunity-metadata'
import type { ContactListItem } from '@/data/contacts.mock'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'

export type ContactOpportunityLookup = {
  id?: string
  name: string
  company: string
  companyId?: string
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** Oportunidades vinculadas al contacto (por nombre o por empresa asociada). */
export function opportunitiesForContact(
  opportunities: OpportunityListItem[],
  contact: ContactOpportunityLookup,
): OpportunityListItem[] {
  const contactName = norm(contact.name)
  const companyName = norm(contact.company)

  const contactId = contact.id?.trim()

  return opportunities.filter((opp) => {
    if (contactId && opp.contactId === contactId) return true
    if (contactName && norm(opp.contactName) === contactName) return true

    if (!companyName || norm(opp.company) !== companyName) return false

    if (contact.companyId && opp.companyId) {
      return opp.companyId === contact.companyId
    }

    return true
  })
}

export function createOpportunityInitialFromContact(contact: {
  id?: string
  name: string
  company: string
  companyId?: string
  email?: string
  phone?: string
  mobilePhone?: string
  source?: string
  owner?: { name: string }
  ownerName?: string
}): Partial<CreateOpportunityFormValues> {
  const ownerName =
    contact.owner?.name?.trim() ||
    contact.ownerName?.trim() ||
    getDefaultOwnerName() ||
    'María López'

  const companies = getAllKnownCompanies()
  const companyName = contact.company.trim()
  const companyId =
    contact.companyId?.trim() ||
    resolveCompanyIdFromName(companies, companyName)

  const contactId = resolveContactIdForLookup({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    companyId,
    company: companyName,
  })

  const listContact: ContactListItem = stampRecordAuditOnCreate({
    id: contactId,
    name: contact.name.trim(),
    subtitle: '',
    avatarUrl: '',
    companyId: companyId || undefined,
    company: companyName,
    email: contact.email?.trim() ?? '',
    phone: contact.phone?.trim() ?? contact.mobilePhone?.trim() ?? '',
    role: '',
    status: 'Prospecto',
    lastContactLabel: '',
    source: contact.source,
    ownerName: contact.owner?.name ?? contact.ownerName,
  })

  const customer = opportunityCustomerPatchFromContact(listContact, companies)

  return {
    ...customer,
    ownerName,
    source: contact.source?.trim() || 'Formulario web',
    name: buildDefaultOpportunityName({
      customerKind: customer.customerKind ?? 'contacto',
      company: customer.company ?? companyName,
      contactName: customer.contactName ?? contact.name.trim(),
    }),
  }
}
