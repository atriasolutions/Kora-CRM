import { createContext } from 'react'

import type { InventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'

export type InventoryRegistryContextValue = {
  userInventory: InventoryListItem[]
  allInventory: InventoryListItem[]
  findById: (id: string) => InventoryListItem | undefined
  updateInventoryFromDetail: (detail: InventoryDetail) => Promise<void>
  reloadFromApi: () => Promise<void>
}

export const InventoryRegistryContext =
  createContext<InventoryRegistryContextValue | null>(null)
