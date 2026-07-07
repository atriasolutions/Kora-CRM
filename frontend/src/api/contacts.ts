import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { CreateContactFormValues } from '@/lib/contact-create'
import { resolveRecordOwnerName } from '@/lib/owner-field'
import { resolveEntityImageSrc } from '@/lib/image-upload'
import { cacheEntityListImage } from '@/lib/entity-list-image-cache'

const BASE = `${API_V1}/contacts`

function normalizeContact(contact: ContactListItem): ContactListItem {
  const avatarUrl = resolveEntityImageSrc(contact.avatarUrl) ?? ''
  if (avatarUrl) {
    cacheEntityListImage('contact', contact.id, avatarUrl)
  }
  return {
    ...contact,
    avatarUrl,
  }
}

export type ContactApiBody = {
  name: string
  subtitle?: string
  avatarUrl?: string
  companyId?: string | null
  company?: string
  email?: string
  phone?: string
  mobilePhone?: string
  role?: string
  status?: string
  rut?: string
  streetAddress?: string
  region?: string
  commune?: string
  linkedIn?: string
  source?: string
  initialNote?: string
  ownerName?: string
  treatmentOpposition?: boolean
  treatmentBlocked?: boolean
  marketingConsent?: boolean | null
  legalBasis?: import('@/types/privacy').ContactLegalBasis
}

export function contactFormToApiBody(
  values: CreateContactFormValues,
): ContactApiBody {
  return {
    name: values.name.trim(),
    avatarUrl: values.avatarUrl?.trim() || undefined,
    companyId: values.companyId?.trim() || null,
    company: values.company?.trim() || undefined,
    email: values.email?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    mobilePhone: values.mobilePhone?.trim() || undefined,
    role: values.role?.trim() || undefined,
    status: values.status,
    rut: values.rut?.trim() || undefined,
    streetAddress: values.streetAddress?.trim() || undefined,
    region: values.region?.trim() || undefined,
    commune: values.commune?.trim() || undefined,
    linkedIn: values.linkedIn?.trim() || undefined,
    source: values.source?.trim() || undefined,
    initialNote: values.initialNote?.trim() || undefined,
    ownerName: values.ownerName?.trim() || undefined,
  }
}

export async function listContactsApi(archived: boolean): Promise<ContactListItem[]> {
  const rows = await fetchAllPages<ContactListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
  return rows.map(normalizeContact)
}

/** Contactos vinculados a una empresa (misma lógica que el listado del backend). */
export async function listContactsForCompanyApi(
  companyId: string,
): Promise<ContactListItem[]> {
  const id = companyId.trim()
  if (!id) return []
  const rows = await fetchAllPages<ContactListItem>(BASE, {
    companyId: id,
    archived: 'false',
  })
  return rows.map(normalizeContact)
}

export async function getContactApi(id: string): Promise<ContactListItem> {
  const res = await fetchJSON<ApiItemResponse<ContactListItem>>(`${BASE}/${id}`)
  return normalizeContact(res.data)
}

export async function createContactApi(
  body: ContactApiBody,
): Promise<ContactListItem> {
  const res = await fetchJSON<ApiItemResponse<ContactListItem>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeContact(res.data)
}

export async function updateContactApi(
  id: string,
  body: Partial<ContactApiBody>,
): Promise<ContactListItem> {
  const res = await fetchJSON<ApiItemResponse<ContactListItem>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeContact(res.data)
}

export async function archiveContactApi(id: string): Promise<ContactListItem> {
  const res = await fetchJSON<ApiItemResponse<ContactListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return normalizeContact(res.data)
}

export async function restoreContactApi(id: string): Promise<ContactListItem> {
  const res = await fetchJSON<ApiItemResponse<ContactListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return normalizeContact(res.data)
}

export async function deleteContactApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export function contactDetailToApiBody(detail: ContactDetail): ContactApiBody {
  return {
    name: detail.name,
    subtitle: detail.subtitle,
    avatarUrl: detail.avatarUrl,
    companyId: detail.companyId ?? null,
    company: detail.company,
    email: detail.email,
    phone: detail.phone,
    mobilePhone: detail.mobilePhone,
    role: detail.role,
    status: detail.status,
    rut: detail.rut,
    streetAddress: detail.streetAddress,
    region: detail.region,
    commune: detail.commune,
    linkedIn: detail.linkedIn,
    source: detail.source,
    initialNote: detail.initialNote,
    ownerName: resolveRecordOwnerName(detail) || undefined,
    treatmentOpposition: detail.treatmentOpposition,
    treatmentBlocked: Boolean(detail.treatmentBlockedAt),
    marketingConsent: detail.marketingConsent,
    legalBasis: detail.legalBasis,
  }
}
