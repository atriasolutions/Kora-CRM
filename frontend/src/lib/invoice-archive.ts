import { STORAGE_PREFIX } from '@/config/brand'
import type { InvoiceListItem } from '@/data/invoices.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-invoices`

export const INVOICE_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedInvoiceRecord = {
  id: string
  archivedAt: number
  snapshot?: InvoiceListItem
}

export type ArchivedInvoiceStore = Record<string, ArchivedInvoiceRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedInvoiceStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedInvoiceStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedInvoiceStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedInvoiceRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as InvoiceListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedInvoiceStore(): ArchivedInvoiceStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedInvoiceStore(store: ArchivedInvoiceStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedInvoiceIds(store: ArchivedInvoiceStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isInvoiceArchived(id: string, store: ArchivedInvoiceStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedInvoiceStore,
  now = Date.now(),
): { store: ArchivedInvoiceStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedInvoiceStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
