import type { PurchaseListItem, PurchaseStatus } from '@/data/purchases.mock'
import { PURCHASE_STATUS_OPTIONS } from '@/data/purchases.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type PurchaseFilters = {
  statuses: PurchaseStatus[]
  date: ListDateFilter
}

export { PURCHASE_STATUS_OPTIONS }

export function createDefaultPurchaseFilters(): PurchaseFilters {
  return {
    statuses: [],
    date: createDefaultListDateFilter(),
  }
}

export function countActivePurchaseFilters(filters: PurchaseFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function purchaseRowMatchesFilters(
  row: PurchaseListItem,
  filters: PurchaseFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
    return false
  }
  if (!listRowMatchesDateFilter(row.createdAt || row.orderDate, filters.date)) {
    return false
  }
  return true
}

export function purchaseFiltersToServerQuery(
  filters: PurchaseFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}
