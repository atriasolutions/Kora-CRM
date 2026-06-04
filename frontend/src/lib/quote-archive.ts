import type { QuoteListItem } from '@/data/quotes.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

export const QUOTE_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedQuoteRecord = {
  id: string
  archivedAt: number
  snapshot?: QuoteListItem
}

export type ArchivedQuoteStore = Record<string, ArchivedQuoteRecord>

export function archivedQuoteIds(store: ArchivedQuoteStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isQuoteArchived(id: string, store: ArchivedQuoteStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedQuoteStore,
  now = Date.now(),
): { store: ArchivedQuoteStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedQuoteStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
