import { STORAGE_PREFIX } from '@/config/brand'
import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'

type EntityKind = 'company' | 'contact'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-list-entity-images`

function storageKey(kind: EntityKind, id: string): string {
  return `${kind}:${id}`
}

function readStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

/** Guarda logo/avatar para mostrar en listados (el API de lista no envía data URLs). */
export function cacheEntityListImage(
  kind: EntityKind,
  id: string,
  imageUrl: string | undefined | null,
) {
  const trimmed = imageUrl?.trim()
  if (!id.trim() || !trimmed) return
  const store = readStore()
  store[storageKey(kind, id)] = trimmed
  writeStore(store)
}

export function removeCachedEntityListImage(kind: EntityKind, id: string) {
  const store = readStore()
  const key = storageKey(kind, id)
  if (!store[key]) return
  delete store[key]
  writeStore(store)
}

export function getCachedEntityListImage(
  kind: EntityKind,
  id: string,
): string | undefined {
  return readStore()[storageKey(kind, id)]
}

export function mergeCompanyListImage(row: CompanyListItem): CompanyListItem {
  if (row.logoUrl?.trim()) {
    cacheEntityListImage('company', row.id, row.logoUrl)
    return row
  }
  const cached = getCachedEntityListImage('company', row.id)
  return cached ? { ...row, logoUrl: cached } : row
}

export function mergeContactListAvatar(row: ContactListItem): ContactListItem {
  if (row.avatarUrl?.trim()) {
    cacheEntityListImage('contact', row.id, row.avatarUrl)
    return row
  }
  const cached = getCachedEntityListImage('contact', row.id)
  return cached ? { ...row, avatarUrl: cached } : row
}

export function mergeListImagesIntoCompanies(
  rows: CompanyListItem[],
): CompanyListItem[] {
  return rows.map(mergeCompanyListImage)
}

export function mergeListImagesIntoContacts(
  rows: ContactListItem[],
): ContactListItem[] {
  return rows.map(mergeContactListAvatar)
}
