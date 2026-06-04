import { STORAGE_PREFIX } from '@/config/brand'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-stock-receipts`

export const STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedStockReceiptRecord = {
  id: string
  archivedAt: number
  snapshot?: StockReceiptListItem
}

export type ArchivedStockReceiptStore = Record<string, ArchivedStockReceiptRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedStockReceiptStore {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const store: ArchivedStockReceiptStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedStockReceiptRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as StockReceiptListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedStockReceiptStore(): ArchivedStockReceiptStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedStockReceiptStore(store: ArchivedStockReceiptStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedStockReceiptIds(store: ArchivedStockReceiptStore): Set<string> {
  return new Set(Object.keys(store))
}

export function purgeExpiredFromStore(
  store: ArchivedStockReceiptStore,
  now = Date.now(),
): { store: ArchivedStockReceiptStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedStockReceiptStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
