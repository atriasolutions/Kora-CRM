import type { OpportunityListItem } from '@/data/opportunities.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

export const OPPORTUNITY_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedOpportunityRecord = {
  id: string
  archivedAt: number
  snapshot?: OpportunityListItem
}

export type ArchivedOpportunityStore = Record<string, ArchivedOpportunityRecord>

export function archivedOpportunityIds(store: ArchivedOpportunityStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isOpportunityArchived(id: string, store: ArchivedOpportunityStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedOpportunityStore,
  now = Date.now(),
): { store: ArchivedOpportunityStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedOpportunityStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
