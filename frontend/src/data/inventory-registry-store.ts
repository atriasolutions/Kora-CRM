import type { InventoryListItem } from '@/data/inventory.mock'

let registryUserInventory: InventoryListItem[] = []

export function syncRegistryInventory(items: InventoryListItem[]) {
  registryUserInventory = items
}

export function getRegistryInventory(): InventoryListItem[] {
  return registryUserInventory
}

export function getAllKnownInventory(): InventoryListItem[] {
  return registryUserInventory
}

export function getRegistryInventoryById(id: string): InventoryListItem | undefined {
  return registryUserInventory.find((i) => i.id === id)
}
