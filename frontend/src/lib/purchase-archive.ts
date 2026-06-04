import { STORAGE_PREFIX } from '@/config/brand'
import type { PurchaseListItem } from '@/data/purchases.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-purchases`

export const PURCHASE_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedPurchaseRecord = {
  id: string
  archivedAt: number
  snapshot?: PurchaseListItem
}

export type ArchivedPurchaseStore = Record<string, ArchivedPurchaseRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedPurchaseStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedPurchaseStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedPurchaseStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedPurchaseRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as PurchaseListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedPurchaseStore(): ArchivedPurchaseStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedPurchaseStore(store: ArchivedPurchaseStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedPurchaseIds(store: ArchivedPurchaseStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isPurchaseArchived(id: string, store: ArchivedPurchaseStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedPurchaseStore,
  now = Date.now(),
): { store: ArchivedPurchaseStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedPurchaseStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
