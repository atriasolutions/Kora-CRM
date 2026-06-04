import { useContext } from 'react'

import { InventoryRegistryContext } from '@/contexts/inventory-registry-context'

export function useInventoryRegistry() {
  const ctx = useContext(InventoryRegistryContext)
  if (!ctx) {
    throw new Error('useInventoryRegistry debe usarse dentro de InventoryRegistryProvider')
  }
  return ctx
}
