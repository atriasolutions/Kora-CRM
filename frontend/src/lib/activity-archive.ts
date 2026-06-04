import { STORAGE_PREFIX } from '@/config/brand'
import type { ActivityListItem } from '@/data/activities.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-activitys`

export const ACTIVITY_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedActivityRecord = {
  id: string
  archivedAt: number
  snapshot?: ActivityListItem
}

export type ArchivedActivityStore = Record<string, ArchivedActivityRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedActivityStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedActivityStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedActivityStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedActivityRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as ActivityListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedActivityStore(): ArchivedActivityStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedActivityStore(store: ArchivedActivityStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedActivityIds(store: ArchivedActivityStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isActivityArchived(id: string, store: ArchivedActivityStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedActivityStore,
  now = Date.now(),
): { store: ArchivedActivityStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedActivityStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
