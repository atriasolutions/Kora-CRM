import { STORAGE_PREFIX } from '@/config/brand'
import type { ProjectListItem } from '@/data/projects.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-projects`

export const PROJECT_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedProjectRecord = {
  id: string
  archivedAt: number
  snapshot?: ProjectListItem
}

export type ArchivedProjectStore = Record<string, ArchivedProjectRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedProjectStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedProjectStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedProjectStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedProjectRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as ProjectListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedProjectStore(): ArchivedProjectStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedProjectStore(store: ArchivedProjectStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedProjectIds(store: ArchivedProjectStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isProjectArchived(id: string, store: ArchivedProjectStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedProjectStore,
  now = Date.now(),
): { store: ArchivedProjectStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedProjectStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
