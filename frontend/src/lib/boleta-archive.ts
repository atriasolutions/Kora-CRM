import { STORAGE_PREFIX } from '@/config/brand'
import type { BoletaListItem } from '@/data/boletas.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-boletas`

export const BOLETA_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedBoletaRecord = {
  id: string
  archivedAt: number
  snapshot?: BoletaListItem
}

export type ArchivedBoletaStore = Record<string, ArchivedBoletaRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedBoletaStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedBoletaStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedBoletaStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedBoletaRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as BoletaListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedBoletaStore(): ArchivedBoletaStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedBoletaStore(store: ArchivedBoletaStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedBoletaIds(store: ArchivedBoletaStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isBoletaArchived(id: string, store: ArchivedBoletaStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredBoletaStore(
  store: ArchivedBoletaStore,
  now = Date.now(),
): { store: ArchivedBoletaStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedBoletaStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
