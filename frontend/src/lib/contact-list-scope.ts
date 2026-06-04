import type { ContactListItem } from '@/data/contacts.mock'
import { resolveContactOwnerName } from '@/data/contact-detail.mock'
import { loadRecentlyViewedContactIds } from '@/lib/contact-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export type ContactListScope = ListScope

export const CONTACT_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis contactos',
  allLabel: 'Todos los contactos',
})

export const CONTACT_SCOPE_SHORT_LABELS: Record<ContactListScope, string> = {
  mine: 'Mis Contactos',
  all: 'Todos',
  recent: 'Recientes',
}

export function contactMatchesListScope(
  row: ContactListItem,
  scope: ContactListScope,
  recentIds?: string[],
): boolean {
  const ids = recentIds ?? loadRecentlyViewedContactIds()
  return matchesListScope(row, scope, (r) => resolveContactOwnerName(r.id, r), ids)
}

export function sortContactsByRecentlyViewed(
  rows: ContactListItem[],
  recentIds?: string[],
): ContactListItem[] {
  const ids = recentIds ?? loadRecentlyViewedContactIds()
  return sortByRecentlyViewed(rows, ids)
}
