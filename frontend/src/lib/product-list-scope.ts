import type { ProductListItem } from '@/data/products.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const PRODUCT_RECENT_SLUG: EntityRecentSlug = 'productos'

export type ProductListScope = ListScope

export const PRODUCT_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis productos',
  allLabel: 'Todos los productos',
})

export const PRODUCT_SCOPE_SHORT_LABELS: Record<ProductListScope, string> = {
  mine: 'Mis Productos',
  all: 'Todos',
  recent: 'Recientes',
}

export function productMatchesListScope(
  row: ProductListItem,
  scope: ProductListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortProductsByRecentlyViewed(
  rows: ProductListItem[],
  recentIds: string[],
): ProductListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadProductRecentIds(): string[] {
  return loadRecentlyViewedIds(PRODUCT_RECENT_SLUG)
}
