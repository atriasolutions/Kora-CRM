import {
  loadRecentlyViewedIds,
  recordEntityView,
  removeEntityFromRecentlyViewed,
} from '@/lib/entity-recently-viewed'

const SLUG = 'contactos' as const

export function recordContactView(contactId: string) {
  recordEntityView(SLUG, contactId)
}

export function loadRecentlyViewedContactIds(): string[] {
  return loadRecentlyViewedIds(SLUG)
}

export function removeContactFromRecentlyViewed(contactId: string) {
  removeEntityFromRecentlyViewed(SLUG, contactId)
}
