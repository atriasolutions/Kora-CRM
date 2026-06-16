import { isApiEnabled } from '@/api/config'
import { getInventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import { getRegistryProducts } from '@/data/products-registry-store'
import { productForInventorySku } from '@/lib/inventory-relations'
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

function inventoryRowOwner(row: InventoryListItem): string {
  if (isApiEnabled()) {
    const product = productForInventorySku(getRegistryProducts(), row.sku)
    return product?.owner?.trim() || '—'
  }
  return getInventoryDetail(row.id).owner
}

export function inventoryMatchesListScope(
  row: InventoryListItem,
  scope: InventoryListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, inventoryRowOwner, recentIds)
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
