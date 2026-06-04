import type { PurchaseListItem } from '@/data/purchases.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const PURCHASE_RECENT_SLUG: EntityRecentSlug = 'compras'

export type PurchaseListScope = ListScope

export const PURCHASE_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis compras',
  allLabel: 'Todas las compras',
})

export const PURCHASE_SCOPE_SHORT_LABELS: Record<PurchaseListScope, string> = {
  mine: 'Mis Compras',
  all: 'Todos',
  recent: 'Recientes',
}

export function purchaseMatchesListScope(
  row: PurchaseListItem,
  scope: PurchaseListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortPurchasesByRecentlyViewed(
  rows: PurchaseListItem[],
  recentIds: string[],
): PurchaseListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadPurchaseRecentIds(): string[] {
  return loadRecentlyViewedIds(PURCHASE_RECENT_SLUG)
}
