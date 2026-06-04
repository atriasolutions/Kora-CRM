import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import { listInventoryApi, updateInventoryApi } from '@/api/inventory'
import { InventoryRegistryContext } from '@/contexts/inventory-registry-context'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import { STORAGE_PREFIX } from '@/config/brand'
import { syncRegistryInventory } from '@/data/inventory-registry-store'
import { listItemFromInventoryDetail } from '@/lib/inventory-form'
import { INVENTORY_REGISTRY_SYNC_EVENT } from '@/lib/product-inventory-sync'
import { INVENTORY_UPDATED_EVENT } from '@/lib/realtime-events'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-inventory`

function loadStoredLocal(): InventoryListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InventoryListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function InventoryRegistryProvider({ children }: { children: ReactNode }) {
  const [userInventory, setUserInventory] = useState<InventoryListItem[]>([])

  const reloadFromApi = useCallback(async () => {
    const items = await listInventoryApi()
    syncRegistryInventory(items)
    setUserInventory(items)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'inventario', enabled: false })

  const save = useCallback((next: InventoryListItem[]) => {
    syncRegistryInventory(next)
    setUserInventory(next)
  }, [])

  const findById = useCallback(
    (id: string) => userInventory.find((i) => i.id === id),
    [userInventory],
  )

  const updateInventoryFromDetail = useCallback(
    async (detail: InventoryDetail) => {
      const list = listItemFromInventoryDetail(detail)
      if (useApi) {
        await updateInventoryApi(detail.id, {
          quantityNum: detail.onHandQtyNum ?? detail.quantityNum,
          minStockNum: detail.minStockNum,
          status: detail.status,
        })
        save(userInventory.map((i) => (i.id === detail.id ? list : i)))
        return
      }
      if (userInventory.some((i) => i.id === detail.id)) {
        save(userInventory.map((i) => (i.id === detail.id ? list : i)))
      }
    },
    [save, userInventory],
  )

  useEffect(() => {
    const onSync = () => {
      if (useApi) {
        reloadFromApi().catch(console.error)
        return
      }
      const loaded = loadStoredLocal()
      syncRegistryInventory(loaded)
      setUserInventory(loaded)
    }
    window.addEventListener(INVENTORY_REGISTRY_SYNC_EVENT, onSync)
    window.addEventListener(INVENTORY_UPDATED_EVENT, onSync)
    return () => {
      window.removeEventListener(INVENTORY_REGISTRY_SYNC_EVENT, onSync)
      window.removeEventListener(INVENTORY_UPDATED_EVENT, onSync)
    }
  }, [reloadFromApi])

  const allInventory = useMemo(
    () => userInventory,
    [userInventory],
  )

  const value = useMemo(
    () => ({
      userInventory,
      allInventory,
      findById,
      updateInventoryFromDetail,
      reloadFromApi,
    }),
    [userInventory, allInventory, findById, updateInventoryFromDetail, reloadFromApi],
  )

  return (
    <InventoryRegistryContext.Provider value={value}>
      {children}
    </InventoryRegistryContext.Provider>
  )
}
