import { getRegistryContacts } from '@/data/contacts-registry-store'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { resolveCanonicalCompanyId } from '@/lib/company-lookup'

export function getAllKnownContacts(): ContactListItem[] {
  return getRegistryContacts()
}

export type ContactLookupRef = {
  id?: string
  name?: string
  email?: string
  companyId?: string
  company?: string
}

/** Id del catálogo aunque la ficha use ids de paginación legacy. */
export function resolveContactIdForLookup(
  contact: ContactLookupRef,
  contacts: ContactListItem[] = getAllKnownContacts(),
): string {
  const linked = findLinkedContact(contacts, contact)
  return linked?.id ?? contact.id?.trim() ?? ''
}

export function findLinkedContact(
  contacts: ContactListItem[],
  lookup: ContactLookupRef,
): ContactListItem | undefined {
  const id = lookup.id?.trim()
  if (id) {
    const byId = findContactById(contacts, id)
    if (byId) return byId
  }

  const nameNorm = lookup.name?.trim().toLowerCase()
  const companyId = lookup.companyId?.trim()
  const companyNorm = lookup.company?.trim().toLowerCase()

  if (nameNorm) {
    const byName = contacts.find((c) => {
      if (c.name.trim().toLowerCase() !== nameNorm) return false
      if (companyId) return !c.companyId?.trim() || c.companyId === companyId
      if (companyNorm) return c.company.trim().toLowerCase() === companyNorm
      return true
    })
    if (byName) return byName
  }

  const emailNorm = lookup.email?.trim().toLowerCase()
  if (emailNorm) {
    return contacts.find((c) => c.email.trim().toLowerCase() === emailNorm)
  }

  return undefined
}

export type ContactLookupPreset = Pick<
  ContactListItem,
  'id' | 'name' | 'email' | 'company' | 'companyId' | 'avatarUrl' | 'role'
>

/** Ítem para el lookup cuando el contacto aún no está en el registry. */
export function contactListItemFromPreset(
  preset: ContactLookupPreset,
): ContactListItem {
  const name = preset.name.trim()
  return {
    id: preset.id.trim(),
    name,
    subtitle: '',
    email: preset.email?.trim() ?? '',
    company: preset.company?.trim() ?? '',
    companyId: preset.companyId,
    avatarUrl: preset.avatarUrl ?? '',
    role: preset.role?.trim() ?? '',
    status: 'Prospecto',
    lastContactLabel: '',
    phone: '',
    createdAt: '',
    createdById: '',
    createdByName: '',
    updatedAt: '',
    updatedById: '',
    updatedByName: '',
  }
}

export function mergeContactLookupPool(
  contacts: ContactListItem[],
  preset?: ContactLookupPreset,
): ContactListItem[] {
  const merged = new Map<string, ContactListItem>()
  for (const contact of contacts) {
    merged.set(contact.id, contact)
  }
  if (!preset?.name.trim() && !preset?.id.trim()) return [...merged.values()]

  const linked = findLinkedContact(contacts, {
    id: preset.id,
    name: preset.name,
    email: preset.email,
    companyId: preset.companyId,
    company: preset.company,
  })
  const item = linked ?? contactListItemFromPreset(preset)
  if (item.id.trim()) merged.set(item.id, item)
  return [...merged.values()]
}

export function findContactById(
  contacts: ContactListItem[],
  contactId: string,
): ContactListItem | undefined {
  if (!contactId.trim()) return undefined
  return contacts.find((c) => c.id === contactId)
}

export function findContactByName(
  contacts: ContactListItem[],
  name: string,
): ContactListItem | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return contacts.find((c) => c.name.trim().toLowerCase() === normalized)
}

export function resolveContactIdFromName(
  contacts: ContactListItem[],
  name: string,
): string {
  return findContactByName(contacts, name)?.id ?? ''
}

/** ¿El contacto pertenece a la empresa indicada (por id, nombre o id canónico)? */
export function contactBelongsToCompany(
  contact: Pick<ContactListItem, 'companyId' | 'company'>,
  companyId: string,
  companyName?: string,
  companies?: CompanyListItem[],
): boolean {
  const scopeId = companyId.trim()
  if (!scopeId) return true

  const contactCompanyId = contact.companyId?.trim() ?? ''
  if (contactCompanyId && contactCompanyId === scopeId) return true

  const nameNorm = companyName?.trim().toLowerCase()
  const contactNameNorm = contact.company.trim().toLowerCase()
  if (nameNorm && contactNameNorm && contactNameNorm === nameNorm) return true

  if (!companies?.length) return false

  const scopeCanonical = resolveCanonicalCompanyId(companies, {
    id: scopeId,
    name: companyName ?? '',
  })
  if (!contactCompanyId) return false

  const contactCanonical = resolveCanonicalCompanyId(companies, {
    id: contactCompanyId,
    name: contact.company,
  })

  return Boolean(
    scopeCanonical && contactCanonical && scopeCanonical === contactCanonical,
  )
}

export function searchContacts(
  contacts: ContactListItem[],
  query: string,
  options?: {
    companyId?: string
    companyName?: string
    companies?: CompanyListItem[]
    limit?: number
  },
): ContactListItem[] {
  const limit = options?.limit ?? 10
  const companyId = options?.companyId?.trim()
  const companyName = options?.companyName?.trim()
  const companies = options?.companies

  let pool = contacts
  if (companyId) {
    pool = contacts.filter((c) =>
      contactBelongsToCompany(c, companyId, companyName, companies),
    )
  }

  const q = query.trim().toLowerCase()
  if (!q) {
    return [...pool]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .slice(0, limit)
  }

  return pool
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}

export function contactDisplayPhone(contact: ContactListItem): string {
  const mobile = contact.mobilePhone?.trim()
  if (mobile) return mobile
  const phone = contact.phone?.trim()
  if (phone && phone !== '—') return phone
  return ''
}
