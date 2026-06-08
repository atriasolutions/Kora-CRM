import { STORAGE_PREFIX } from '@/config/brand'
import type { SolicitudListItem } from '@/data/solicitudes.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-solicitudes`

export const SOLICITUD_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedSolicitudRecord = {
  id: string
  archivedAt: number
  snapshot?: SolicitudListItem
}

export type ArchivedSolicitudStore = Record<string, ArchivedSolicitudRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedSolicitudStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedSolicitudStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedSolicitudStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedSolicitudRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as SolicitudListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedSolicitudStore(): ArchivedSolicitudStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedSolicitudStore(store: ArchivedSolicitudStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedSolicitudIds(store: ArchivedSolicitudStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isSolicitudArchived(id: string, store: ArchivedSolicitudStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedSolicitudStore,
  now = Date.now(),
): { store: ArchivedSolicitudStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedSolicitudStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
