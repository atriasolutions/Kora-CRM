import { isApiEnabled } from '@/api/config'
import { STORAGE_PREFIX } from '@/config/brand'

const CLEANUP_FLAG = `${STORAGE_PREFIX}-api-storage-cleaned-v4`

/** Claves exactas de listas, archivos y overrides locales (sustituidas por API). */
const EXACT_KEYS = [
  `${STORAGE_PREFIX}-crm-user-activities`,
  `${STORAGE_PREFIX}-crm-user-projects`,
  `${STORAGE_PREFIX}-crm-user-invoices`,
  `${STORAGE_PREFIX}-crm-user-stock-receipts`,
  `${STORAGE_PREFIX}-crm-user-inventory`,
  `${STORAGE_PREFIX}-crm-reports-tree`,
  `${STORAGE_PREFIX}-crm-entity-notes`,
  `${STORAGE_PREFIX}-crm-company-details`,
  `${STORAGE_PREFIX}-crm-invoice-details`,
  `${STORAGE_PREFIX}-crm-purchase-details`,
  `${STORAGE_PREFIX}-crm-product-detail-overrides`,
  `${STORAGE_PREFIX}-crm-stock-receipt-details`,
  `${STORAGE_PREFIX}-crm-stock-ledger`,
  `${STORAGE_PREFIX}-crm-invoice-journey`,
  `${STORAGE_PREFIX}-crm-purchase-journey`,
  `${STORAGE_PREFIX}-crm-project-journey`,
  `${STORAGE_PREFIX}-crm-project-relations`,
  `${STORAGE_PREFIX}-crm-catalog-settings`,
  `${STORAGE_PREFIX}-crm-organization-settings`,
  'kora-profiles-registry-v1',
  'zenter-profiles-registry-v1',
  'zenter-crm-local-notifications',
] as const

/** Prefijos de claves dinámicas (archivos por entidad, archivados, detalle usuario). */
const KEY_PREFIXES = [
  `${STORAGE_PREFIX}-crm-archived-`,
  `${STORAGE_PREFIX}-invoice-files-`,
  `${STORAGE_PREFIX}-purchase-files-`,
  `${STORAGE_PREFIX}-inventory-files-`,
  `${STORAGE_PREFIX}-crm-user-detail-`,
] as const

/**
 * Elimina datos locales de la era mock que desincronizan listas/kanban con la API.
 * Se ejecuta una vez por pestaña cuando `VITE_USE_API` está activo.
 */
export function clearLegacyLocalStorageForApiMode(): number {
  if (!isApiEnabled()) return 0
  if (sessionStorage.getItem(CLEANUP_FLAG)) return 0

  let removed = 0

  for (const key of EXACT_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      removed += 1
    }
  }

  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    if (KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
    removed += 1
  }

  sessionStorage.setItem(CLEANUP_FLAG, String(Date.now()))
  return removed
}
