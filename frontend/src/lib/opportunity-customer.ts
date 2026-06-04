import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { findCompanyById, resolveCompanyIdFromName } from '@/lib/company-lookup'
import { contactDisplayPhone } from '@/lib/contact-lookup'
import type { SaleCustomerKind } from '@/lib/sale-customer'

export type OpportunityCustomerKind = SaleCustomerKind

export type OpportunityCustomerValues = {
  customerKind: OpportunityCustomerKind
  companyId: string
  company: string
  contactId: string
  contactName: string
}

export function defaultOpportunityCustomerValues(
  partial?: Partial<OpportunityCustomerValues>,
): OpportunityCustomerValues {
  return {
    customerKind: 'empresa',
    companyId: '',
    company: '',
    contactId: '',
    contactName: '',
    ...partial,
  }
}

export function resolveOpportunityCustomerKind(opp: {
  customerKind?: OpportunityCustomerKind
  companyId?: string
}): OpportunityCustomerKind {
  if (opp.customerKind === 'contacto' || opp.customerKind === 'empresa') {
    return opp.customerKind
  }
  return opp.companyId?.trim() ? 'empresa' : 'contacto'
}

/** Contacto vinculado a una empresa (por id o nombre en ficha). */
export function contactHasLinkedCompany(
  contact: Pick<ContactListItem, 'companyId' | 'company'>,
): boolean {
  return Boolean(contact.companyId?.trim()) || Boolean(contact.company.trim())
}

/**
 * Al elegir un contacto en el formulario de oportunidad:
 * - con empresa → B2B, empresa y contacto preseleccionados;
 * - sin empresa → B2C, solo contacto.
 */
export function opportunityCustomerPatchFromContact(
  contact: ContactListItem,
  companies: CompanyListItem[],
): OpportunityCustomerValues & { contactEmail: string; contactPhone: string } {
  const base = {
    contactId: contact.id,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contactDisplayPhone(contact),
  }

  if (!contactHasLinkedCompany(contact)) {
    return {
      customerKind: 'contacto',
      companyId: '',
      company: '',
      ...base,
    }
  }

  const companyId =
    contact.companyId?.trim() ||
    resolveCompanyIdFromName(companies, contact.company) ||
    ''
  const linked = companyId ? findCompanyById(companies, companyId) : undefined

  return {
    customerKind: 'empresa',
    companyId,
    company: linked?.name ?? contact.company.trim(),
    ...base,
  }
}

export function validateOpportunityCustomer(values: OpportunityCustomerValues): string | null {
  if (values.customerKind === 'contacto') {
    if (!values.contactId.trim()) {
      return 'Selecciona un contacto (cliente B2C).'
    }
    return null
  }
  if (!values.companyId.trim()) return 'Selecciona una empresa (cliente B2B).'
  if (!values.contactId.trim()) {
    return 'Selecciona el contacto de la empresa (B2B).'
  }
  return null
}
