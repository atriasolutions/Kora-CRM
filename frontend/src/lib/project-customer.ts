import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import {
  opportunityCustomerPatchFromContact,
  resolveOpportunityCustomerKind,
  type OpportunityCustomerKind,
} from '@/lib/opportunity-customer'
import type { SaleCustomerKind } from '@/lib/sale-customer'

/** Vacío = cliente en texto libre (opcional B2B/B2C). */
export type ProjectCustomerKind = '' | SaleCustomerKind

export type ProjectCustomerSlice = {
  customerKind: ProjectCustomerKind
  companyId: string
  company: string
  contactId: string
  contactName: string
  client: string
}

export function defaultProjectCustomerSlice(
  partial?: Partial<ProjectCustomerSlice>,
): ProjectCustomerSlice {
  return {
    customerKind: '',
    companyId: '',
    company: '',
    contactId: '',
    contactName: '',
    client: '',
    ...partial,
  }
}

export function inferProjectCustomerKind(
  item: Pick<ProjectListItem, 'customerKind' | 'companyId' | 'contactId'>,
): ProjectCustomerKind {
  if (item.customerKind === 'empresa' || item.customerKind === 'contacto') {
    return item.customerKind
  }
  if (item.contactId?.trim()) return 'contacto'
  if (item.companyId?.trim()) return 'empresa'
  return ''
}

export function projectCustomerFromListItem(
  item: Pick<
    ProjectListItem,
    'client' | 'companyId' | 'customerKind' | 'contactId' | 'contactName'
  >,
): ProjectCustomerSlice {
  return {
    customerKind: inferProjectCustomerKind(item),
    companyId: item.companyId ?? '',
    company: item.companyId ? item.client : '',
    contactId: item.contactId ?? '',
    contactName: item.contactName ?? (item.contactId ? item.client : ''),
    client: inferProjectCustomerKind(item) ? '' : item.client,
  }
}

export function projectCustomerFromOpportunity(
  opp: OpportunityListItem,
): ProjectCustomerSlice {
  const customerKind = resolveOpportunityCustomerKind(opp)
  const client =
    customerKind === 'contacto'
      ? (opp.contactName?.trim() ?? '')
      : (opp.company?.trim() ?? '')
  return {
    customerKind,
    companyId: opp.companyId ?? '',
    company: opp.company ?? '',
    contactId: opp.contactId ?? '',
    contactName: opp.contactName ?? '',
    client,
  }
}

export function projectCustomerPatchFromContact(
  contact: ContactListItem,
  companies: CompanyListItem[],
): Partial<ProjectCustomerSlice> {
  const fromOpp = opportunityCustomerPatchFromContact(contact, companies)
  const customerKind = fromOpp.customerKind as OpportunityCustomerKind
  return {
    customerKind,
    companyId: fromOpp.companyId,
    company: fromOpp.company,
    contactId: fromOpp.contactId,
    contactName: fromOpp.contactName,
    client: customerKind === 'contacto' ? fromOpp.contactName : fromOpp.company,
  }
}

export function resolveProjectClientName(values: ProjectCustomerSlice): string {
  if (values.customerKind === 'empresa') {
    return values.company.trim() || values.client.trim()
  }
  if (values.customerKind === 'contacto') {
    return values.contactName.trim() || values.client.trim()
  }
  return values.client.trim()
}

export function validateProjectCustomer(values: ProjectCustomerSlice): string | null {
  if (!values.customerKind) {
    if (!values.client.trim()) {
      return 'Indica el nombre del cliente o elige un tipo B2B/B2C.'
    }
    return null
  }
  if (values.customerKind === 'empresa') {
    if (!values.companyId.trim() && !values.company.trim() && !values.client.trim()) {
      return 'Selecciona una empresa (B2B) o escribe el nombre del cliente.'
    }
    return null
  }
  if (!values.contactId.trim()) {
    return 'Selecciona un contacto (B2C).'
  }
  return null
}

export function projectCustomerToListPatch(
  values: ProjectCustomerSlice,
): Pick<ProjectListItem, 'client' | 'companyId' | 'customerKind' | 'contactId' | 'contactName'> {
  const customerKind = values.customerKind || undefined
  const client = resolveProjectClientName(values)
  return {
    client,
    companyId:
      values.customerKind === 'empresa' ? values.companyId.trim() || undefined : undefined,
    contactId:
      values.customerKind === 'contacto' ? values.contactId.trim() || undefined : undefined,
    contactName:
      values.customerKind === 'contacto' ? values.contactName.trim() || undefined : undefined,
    customerKind: customerKind as ProjectListItem['customerKind'],
  }
}

export function projectCustomerApiFields(values: ProjectCustomerSlice) {
  const client = resolveProjectClientName(values)
  return {
    client,
    customerKind: values.customerKind || undefined,
    companyId:
      values.customerKind === 'empresa' ? values.companyId.trim() || undefined : undefined,
    contactId:
      values.customerKind === 'contacto' ? values.contactId.trim() || undefined : undefined,
  }
}
