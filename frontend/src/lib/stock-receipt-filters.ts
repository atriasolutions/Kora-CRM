import type { StockReceiptListItem, StockReceiptStatus } from '@/data/stock-receipts.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export const STOCK_RECEIPT_STATUS_OPTIONS: StockReceiptStatus[] = ['Borrador', 'Confirmado']

export type StockReceiptFilters = {
  statuses: StockReceiptStatus[]
  warehouse: string
  origin: 'all' | 'purchase' | 'external'
  date: ListDateFilter
}

export function createDefaultStockReceiptFilters(): StockReceiptFilters {
  return {
    statuses: [],
    warehouse: '',
    origin: 'all',
    date: createDefaultListDateFilter(),
  }
}

export function countActiveStockReceiptFilters(filters: StockReceiptFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.warehouse.trim()) n += 1
  if (filters.origin !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function stockReceiptRowMatchesFilters(
  row: StockReceiptListItem,
  filters: StockReceiptFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
    return false
  }
  if (
    filters.warehouse.trim() &&
    !row.warehouse.toLowerCase().includes(filters.warehouse.trim().toLowerCase())
  ) {
    return false
  }
  if (filters.origin === 'purchase' && !row.purchaseId) return false
  if (filters.origin === 'external' && row.purchaseId) return false
  const dateKey = row.updatedAt || row.createdAt
  if (!listRowMatchesDateFilter(dateKey, filters.date)) return false
  return true
}

/** Filtros que el listado API no aplica (quedan en cliente). */
export function stockReceiptHasClientOnlyFilters(filters: StockReceiptFilters): boolean {
  return Boolean(filters.warehouse.trim()) || filters.origin !== 'all'
}

export function stockReceiptFiltersToServerQuery(
  filters: StockReceiptFilters,
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
