import type { CompanyListItem } from '@/data/companies.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

export const COMPANY_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedCompanyRecord = {
  id: string
  archivedAt: number
  snapshot?: CompanyListItem
}

export type ArchivedCompanyStore = Record<string, ArchivedCompanyRecord>

export function archivedCompanyIds(store: ArchivedCompanyStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isCompanyArchived(id: string, store: ArchivedCompanyStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedCompanyStore,
  now = Date.now(),
): { store: ArchivedCompanyStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedCompanyStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
