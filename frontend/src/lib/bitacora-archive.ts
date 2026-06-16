import { STORAGE_PREFIX } from '@/config/brand'
import type { BitacoraListItem } from '@/data/bitacora.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-bitacora`

export const BITACORA_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedBitacoraRecord = {
  id: string
  archivedAt: number
  snapshot?: BitacoraListItem
}

export type ArchivedBitacoraStore = Record<string, ArchivedBitacoraRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedBitacoraStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedBitacoraStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedBitacoraStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedBitacoraRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as BitacoraListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedBitacoraStore(): ArchivedBitacoraStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedBitacoraStore(store: ArchivedBitacoraStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedBitacoraIds(store: ArchivedBitacoraStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isBitacoraArchived(id: string, store: ArchivedBitacoraStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedBitacoraStore,
  now = Date.now(),
): { store: ArchivedBitacoraStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedBitacoraStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
