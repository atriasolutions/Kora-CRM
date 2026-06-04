import { getInventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const INVENTORY_RECENT_SLUG: EntityRecentSlug = 'inventario'

export type InventoryListScope = ListScope

export const INVENTORY_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mi inventario',
  allLabel: 'Todo el inventario',
})

export const INVENTORY_SCOPE_SHORT_LABELS: Record<InventoryListScope, string> = {
  mine: 'Mi Inventario',
  all: 'Todos',
  recent: 'Recientes',
}

export function inventoryMatchesListScope(
  row: InventoryListItem,
  scope: InventoryListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => getInventoryDetail(r.id).owner, recentIds)
}

export function sortInventoryByRecentlyViewed(
  rows: InventoryListItem[],
  recentIds: string[],
): InventoryListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadInventoryRecentIds(): string[] {
  return loadRecentlyViewedIds(INVENTORY_RECENT_SLUG)
}
