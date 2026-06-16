import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { AdjustInventoryStockDialog } from '@/components/inventory/AdjustInventoryStockDialog'
import { InventoryKanbanView } from '@/components/inventory/InventoryKanbanView'
import {
  InventoryModuleHeader,
  type InventoryViewId,
} from '@/components/inventory/InventoryModuleHeader'
import { InventorySegmentsView } from '@/components/inventory/InventorySegmentsView'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { InventoryProductList } from '@/components/inventory/InventoryProductList'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import { PURCHASE_LINES_SYNC_EVENT } from '@/data/purchases-registry-store'
import { STOCK_RECEIPT_LINES_SYNC_EVENT } from '@/data/stock-receipt-lines-registry-store'
import { isApiEnabled } from '@/api/config'
import { useInventoryRegistry } from '@/hooks/use-inventory-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useStockSync } from '@/hooks/use-stock-sync'
import { buildInventoryDetailForAdjustment } from '@/lib/inventory-product-detail'
import {
  createDefaultInventoryFilters,
  type InventoryFilters,
} from '@/lib/inventory-filters'
import {
  inventoryMatchesListScope,
  loadInventoryRecentIds,
  sortInventoryByRecentlyViewed,
  type InventoryListScope,
} from '@/lib/inventory-list-scope'

const useApi = isApiEnabled()

export function InventoryPage() {
  const location = useLocation()
  const { canEdit } = useModulePermissions('inventario')
  const { allInventory, updateInventoryFromDetail, reloadFromApi } = useInventoryRegistry()

  const [view, setView] = useState<InventoryViewId>('lista')
  const [listScope, setListScope] = useState<InventoryListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<InventoryFilters>(() =>
    createDefaultInventoryFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [purchaseLinesKey, setPurchaseLinesKey] = useState(0)
  const [listToolbar, setListToolbar] = useState<ReactNode>(null)
  const stockVersion = useStockSync()

  const recentIds = useMemo(
    () => loadInventoryRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const activeInventory = useMemo(() => {
    const filtered = allInventory.filter((row) =>
      inventoryMatchesListScope(row, listScope, recentIds),
    )
    if (listScope === 'recent') {
      return sortInventoryByRecentlyViewed(filtered, recentIds)
    }
    return filtered
  }, [allInventory, listScope, recentIds, stockVersion])

  useEffect(() => {
    if (location.pathname === '/inventario') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!useApi) return
    void reloadFromApi().catch(() => {})
  }, [reloadFromApi])

  useEffect(() => {
    const bump = () => setPurchaseLinesKey((k) => k + 1)
    window.addEventListener(PURCHASE_LINES_SYNC_EVENT, bump)
    window.addEventListener(STOCK_RECEIPT_LINES_SYNC_EVENT, bump)
    return () => {
      window.removeEventListener(PURCHASE_LINES_SYNC_EVENT, bump)
      window.removeEventListener(STOCK_RECEIPT_LINES_SYNC_EVENT, bump)
    }
  }, [])

  useEffect(() => {
    if (!useApi) return
    void (async () => {
      const { listStockReceiptsApi } = await import('@/api/stock-receipts')
      const { syncStockReceiptLinesForReceipts } = await import(
        '@/lib/sync-stock-receipt-lines-registry'
      )
      const { getAllRegistryPurchases } = await import('@/data/purchases-registry-store')
      const { isPurchaseOpenForInTransit } = await import('@/lib/inventory-in-transit')
      const openIds = new Set(
        getAllRegistryPurchases()
          .filter((p) => isPurchaseOpenForInTransit(p.status))
          .map((p) => p.id),
      )
      const [activeReceipts, archivedReceipts] = await Promise.all([
        listStockReceiptsApi(false),
        listStockReceiptsApi(true),
      ])
      await syncStockReceiptLinesForReceipts(
        [...activeReceipts, ...archivedReceipts].filter(
          (r) => r.purchaseId && openIds.has(r.purchaseId),
        ),
        { confirmedOnly: false },
      )
    })()
  }, [])

  const [editOpen, setEditOpen] = useState(false)
  const [editingInventory, setEditingInventory] = useState<InventoryDetail | null>(null)

  const openEditInventory = useCallback((row: InventoryListItem) => {
    setEditingInventory(buildInventoryDetailForAdjustment(row))
    setEditOpen(true)
  }, [])

  const handleStockApplied = useCallback(() => {
    if (!editingInventory) return
    void (async () => {
      if (useApi) {
        await reloadFromApi()
      } else {
        await updateInventoryFromDetail(editingInventory)
      }
      setListRefreshKey((k) => k + 1)
      toast.success(`Movimiento registrado para «${editingInventory.productName}».`)
    })()
  }, [editingInventory, reloadFromApi, updateInventoryFromDetail])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <InventoryModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            filters={filters}
            onFiltersChange={setFilters}
            listScope={listScope}
            onListScopeChange={setListScope}
            toolbarEnd={view === 'lista' ? listToolbar : undefined}
          />
        }
      >
        {view === 'lista' ? (
          <InventoryProductList
            key={purchaseLinesKey}
            rows={activeInventory}
            query={query}
            filters={filters}
            onEditRow={canEdit ? openEditInventory : undefined}
            onToolbarChange={setListToolbar}
          />
        ) : null}

        {view === 'kanban' ? (
          <InventoryKanbanView items={activeInventory} query={query} filters={filters} />
        ) : null}

        {view === 'segmentos' ? (
          <InventorySegmentsView items={activeInventory} query={query} filters={filters} />
        ) : null}

        {canEdit && editingInventory ? (
          <AdjustInventoryStockDialog
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open)
              if (!open) setEditingInventory(null)
            }}
            inventory={editingInventory}
            onApplied={handleStockApplied}
          />
        ) : null}
      </ListPageLayout>
    </div>
  )
}
