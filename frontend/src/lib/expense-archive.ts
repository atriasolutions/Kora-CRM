import { STORAGE_PREFIX } from '@/config/brand'
import type { ExpenseListItem } from '@/data/expenses.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-expenses`

export const EXPENSE_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedExpenseRecord = {
  id: string
  archivedAt: number
  snapshot?: ExpenseListItem
}

export type ArchivedExpenseStore = Record<string, ArchivedExpenseRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedExpenseStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedExpenseStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedExpenseStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedExpenseRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as ExpenseListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedExpenseStore(): ArchivedExpenseStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedExpenseStore(store: ArchivedExpenseStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedExpenseIds(store: ArchivedExpenseStore): Set<string> {
  return new Set(Object.keys(store))
}

export function purgeExpiredExpenseStore(
  store: ArchivedExpenseStore,
  now = Date.now(),
): { store: ArchivedExpenseStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedExpenseStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
