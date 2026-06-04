import type { StockReceiptListItem, StockReceiptStatus } from '@/data/stock-receipts.mock'

export const STOCK_RECEIPT_STATUS_OPTIONS: StockReceiptStatus[] = ['Borrador', 'Confirmado']

export type StockReceiptFilters = {
  statuses: StockReceiptStatus[]
  warehouse: string
  origin: 'all' | 'purchase' | 'external'
}

export function createDefaultStockReceiptFilters(): StockReceiptFilters {
  return { statuses: [], warehouse: '', origin: 'all' }
}

export function countActiveStockReceiptFilters(filters: StockReceiptFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.warehouse.trim()) n += 1
  if (filters.origin !== 'all') n += 1
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
  return true
}
