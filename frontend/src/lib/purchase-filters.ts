import type { PurchaseListItem, PurchaseStatus } from '@/data/purchases.mock'
import { PURCHASE_STATUS_OPTIONS } from '@/data/purchases.mock'

export type PurchaseFilters = {
  statuses: PurchaseStatus[]
}

export { PURCHASE_STATUS_OPTIONS }

export function createDefaultPurchaseFilters(): PurchaseFilters {
  return { statuses: [] }
}

export function countActivePurchaseFilters(filters: PurchaseFilters): number {
  return filters.statuses.length > 0 ? 1 : 0
}

export function purchaseRowMatchesFilters(
  row: PurchaseListItem,
  filters: PurchaseFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
    return false
  }
  return true
}
