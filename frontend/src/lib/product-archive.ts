import { STORAGE_PREFIX } from '@/config/brand'
import type { ProductListItem } from '@/data/products.mock'

import {
  CONTACT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
  isArchiveExpired,
} from '@/lib/contact-archive'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-archived-products`

export const PRODUCT_ARCHIVE_RETENTION_DAYS = CONTACT_ARCHIVE_RETENTION_DAYS

/** Aviso al archivar: la eliminación definitiva borra stock en inventario. */
export const PRODUCT_ARCHIVE_INVENTORY_WARNING =
  'Al eliminarse definitivamente (desde la papelera o tras 30 días), también se borrarán las posiciones de inventario y los movimientos de stock asociados.'

/** Aviso al eliminar permanentemente desde la papelera. */
export const PRODUCT_PERMANENT_DELETE_INVENTORY_WARNING =
  'También se eliminarán las posiciones de inventario y los movimientos de stock asociados a este producto. Esta acción no se puede deshacer.'

export { daysUntilPurge, formatArchivePurgeLabel, formatArchivedAt }

export type ArchivedProductRecord = {
  id: string
  archivedAt: number
  snapshot?: ProductListItem
}

export type ArchivedProductStore = Record<string, ArchivedProductRecord>

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateLegacy(parsed: unknown): ArchivedProductStore {
  if (Array.isArray(parsed)) {
    const now = Date.now()
    const store: ArchivedProductStore = {}
    for (const id of parsed) {
      if (typeof id === 'string' && id.trim()) {
        store[id] = { id, archivedAt: now }
      }
    }
    return store
  }
  if (parsed && typeof parsed === 'object') {
    const store: ArchivedProductStore = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!id.trim()) continue
      if (value && typeof value === 'object' && 'archivedAt' in value) {
        const rec = value as ArchivedProductRecord
        if (typeof rec.archivedAt === 'number') {
          store[id] = {
            id,
            archivedAt: rec.archivedAt,
            snapshot:
              rec.snapshot && typeof rec.snapshot === 'object'
                ? (rec.snapshot as ProductListItem)
                : undefined,
          }
        }
      }
    }
    return store
  }
  return {}
}

export function loadArchivedProductStore(): ArchivedProductStore {
  return migrateLegacy(readRaw())
}

export function saveArchivedProductStore(store: ArchivedProductStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota */
  }
}

export function archivedProductIds(store: ArchivedProductStore): Set<string> {
  return new Set(Object.keys(store))
}

export function isProductArchived(id: string, store: ArchivedProductStore): boolean {
  return Boolean(store[id])
}

export function purgeExpiredFromStore(
  store: ArchivedProductStore,
  now = Date.now(),
): { store: ArchivedProductStore; purgedIds: string[] } {
  const purgedIds: string[] = []
  const next: ArchivedProductStore = {}
  for (const [id, record] of Object.entries(store)) {
    if (isArchiveExpired(record.archivedAt, now)) {
      purgedIds.push(id)
    } else {
      next[id] = record
    }
  }
  return { store: next, purgedIds }
}
