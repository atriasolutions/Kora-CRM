import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const STOCK_RECEIPT_RECENT_SLUG: EntityRecentSlug = 'ingresos'

export type StockReceiptListScope = ListScope

export const STOCK_RECEIPT_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis ingresos',
  allLabel: 'Todos los ingresos',
})

export const STOCK_RECEIPT_SCOPE_SHORT_LABELS: Record<StockReceiptListScope, string> = {
  mine: 'Mis ingresos',
  all: 'Todos',
  recent: 'Recientes',
}

export function stockReceiptMatchesListScope(
  row: StockReceiptListItem,
  scope: StockReceiptListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortStockReceiptsByRecentlyViewed(
  rows: StockReceiptListItem[],
  recentIds: string[],
): StockReceiptListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadStockReceiptRecentIds(): string[] {
  return loadRecentlyViewedIds(STOCK_RECEIPT_RECENT_SLUG)
}
