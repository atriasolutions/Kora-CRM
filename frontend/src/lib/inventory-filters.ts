import type { InventoryListItem, InventoryStatus } from '@/data/inventory.mock'
import {
  INVENTORY_LOCATION_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
} from '@/data/inventory.mock'

export type InventoryFilters = {
  statuses: InventoryStatus[]
  locations: string[]
}

export { INVENTORY_STATUS_OPTIONS, INVENTORY_LOCATION_OPTIONS }

export function createDefaultInventoryFilters(): InventoryFilters {
  return { statuses: [], locations: [] }
}

export function countActiveInventoryFilters(filters: InventoryFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.locations.length > 0) n += 1
  return n
}

export function inventoryRowMatchesFilters(
  row: InventoryListItem,
  filters: InventoryFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
    return false
  }
  if (filters.locations.length > 0 && !filters.locations.includes(row.location)) {
    return false
  }
  return true
}
