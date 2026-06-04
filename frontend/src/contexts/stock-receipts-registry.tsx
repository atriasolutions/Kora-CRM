import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import { listInventoryApi } from '@/api/inventory'
import {
  archiveStockReceiptApi,
  confirmStockReceiptApi,
  createStockReceiptApi,
  getStockReceiptApi,
  listStockReceiptsApi,
  permanentlyDeleteStockReceiptApi,
  restoreStockReceiptApi,
  stockReceiptDetailToApiBody,
  stockReceiptFormToApiBody,
  updateStockReceiptApi,
} from '@/api/stock-receipts'
import {
  StockReceiptsRegistryContext,
  type ArchivedStockReceiptEntry,
  type StockReceiptsRegistryValue,
} from '@/contexts/stock-receipts-registry-context'
import { resolveStockReceiptListItem } from '@/data/stock-receipt-detail.mock'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import { STORAGE_PREFIX } from '@/config/brand'
import {
  syncRegistryArchivedStockReceipts,
  syncRegistryStockReceipts,
} from '@/data/stock-receipts-registry-store'
import { syncRegistryInventory } from '@/data/inventory-registry-store'
import { persistStockReceiptDetailOverride } from '@/lib/stock-receipt-detail-storage'
import {
  listItemFromStockReceiptDetail,
  stockReceiptFormValuesToDetailOverride,
  stockReceiptFormValuesToListItem,
  type StockReceiptFormValues,
} from '@/lib/stock-receipt-form'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import {
  type ArchivedStockReceiptStore,
  archivedStockReceiptIds,
  loadArchivedStockReceiptStore,
  saveArchivedStockReceiptStore,
} from '@/lib/stock-receipt-archive'
import { INVENTORY_REGISTRY_SYNC_EVENT } from '@/lib/product-inventory-sync'
import { purgeStockReceiptLocalData } from '@/lib/stock-receipt-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-stock-receipts`

function loadStoredLocal(): StockReceiptListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StockReceiptListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function snapshotForArchive(
  id: string,
  userReceipts: StockReceiptListItem[],
): StockReceiptListItem {
  const fromUser = userReceipts.find((r) => r.id === id)
  const base = fromUser ? { ...fromUser } : resolveStockReceiptListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function receiptsFromArchiveStore(
  store: ArchivedStockReceiptStore,
  userReceipts: StockReceiptListItem[],
): StockReceiptListItem[] {
  return Object.values(store).map(
    (record) => record.snapshot ?? snapshotForArchive(record.id, userReceipts),
  )
}

function entriesFromStore(
  store: ArchivedStockReceiptStore,
  userReceipts: StockReceiptListItem[],
): ArchivedStockReceiptEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      receipt: record.snapshot ?? snapshotForArchive(record.id, userReceipts),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

async function reloadInventoryFromApi() {
  const items = await listInventoryApi()
  syncRegistryInventory(items)
  window.dispatchEvent(new CustomEvent(INVENTORY_REGISTRY_SYNC_EVENT))
}

export function StockReceiptsRegistryProvider({ children }: { children: ReactNode }) {
  const [userReceipts, setUserReceipts] = useState<StockReceiptListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStoredLocal()
    syncRegistryStockReceipts(loaded)
    return loaded
  })
  const [archiveStore, setArchiveStore] = useState<ArchivedStockReceiptStore>(() =>
    useApi ? {} : loadArchivedStockReceiptStore(),
  )

  useEffect(() => {
    syncRegistryArchivedStockReceipts(
      receiptsFromArchiveStore(archiveStore, userReceipts),
    )
  }, [archiveStore, userReceipts])

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listStockReceiptsApi(false),
      listStockReceiptsApi(true),
    ])
    syncRegistryStockReceipts(active)
    syncRegistryArchivedStockReceipts(archived)
    setUserReceipts(active)
    setArchiveStore(archivedStoreFromList(archived))
    const { syncStockReceiptLinesForReceipts } = await import(
      '@/lib/sync-stock-receipt-lines-registry'
    )
    const allForLines = [...active, ...archived]
    await syncStockReceiptLinesForReceipts(allForLines, { confirmedOnly: false })
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedStockReceiptIds(archiveStore), [archiveStore])

  const save = useCallback((next: StockReceiptListItem[]) => {
    syncRegistryStockReceipts(next)
    setUserReceipts(next)
  }, [])

  const persistArchive = useCallback(
    (store: ArchivedStockReceiptStore, receiptsForSnapshot: StockReceiptListItem[]) => {
      if (!useApi) saveArchivedStockReceiptStore(store)
      syncRegistryArchivedStockReceipts(
        receiptsFromArchiveStore(store, receiptsForSnapshot),
      )
      setArchiveStore(store)
    },
    [],
  )

  const findById = useCallback(
    (id: string) => userReceipts.find((r) => r.id === id),
    [userReceipts],
  )

  const addReceipt = useCallback(
    async (values: StockReceiptFormValues) => {
      if (useApi) {
        const detail = await createStockReceiptApi(stockReceiptFormToApiBody(values))
        const item = listItemFromStockReceiptDetail(detail)
        save([item, ...userReceipts])
        return item
      }
      const item = stockReceiptFormValuesToListItem(values)
      persistStockReceiptDetailOverride(
        item.id,
        stockReceiptFormValuesToDetailOverride(values, item.id),
      )
      save([item, ...userReceipts])
      return item
    },
    [save, userReceipts],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateReceiptFromDetail = useCallback(
    async (detail: StockReceiptDetail) => {
      const list = listItemFromStockReceiptDetail(detail)
      if (useApi) {
        await updateStockReceiptApi(detail.id, stockReceiptDetailToApiBody(detail))
        save(userReceipts.map((r) => (r.id === detail.id ? list : r)))
        return
      }
      persistStockReceiptDetailOverride(detail.id, {
        lineItems: detail.lineItems,
        notes: detail.notes,
        memo: detail.memo,
        externalReference: detail.externalReference,
        warehouse: detail.warehouse,
        purchaseId: detail.purchaseId,
        purchaseReference: detail.purchaseReference,
        supplier: detail.supplier,
        status: detail.status,
        confirmedAt: detail.confirmedAt,
      })
      if (userReceipts.some((r) => r.id === detail.id)) {
        save(userReceipts.map((r) => (r.id === detail.id ? list : r)))
      }
    },
    [save, userReceipts],
  )

  const confirmReceipt = useCallback(
    async (
      detail: StockReceiptDetail,
      options?: { onPurchaseUpdated?: (purchaseId: string) => void },
    ): Promise<{ ok: boolean; message?: string }> => {
      if (detail.status === 'Confirmado') {
        return { ok: false, message: 'Este ingreso ya está confirmado.' }
      }

      if (useApi) {
        try {
          const confirmed = await confirmStockReceiptApi(detail.id)
          const list = listItemFromStockReceiptDetail(confirmed)
          save(userReceipts.map((r) => (r.id === detail.id ? list : r)))
          const { syncRegistryStockReceiptLines } = await import(
            '@/data/stock-receipt-lines-registry-store'
          )
          syncRegistryStockReceiptLines({
            [confirmed.id]: confirmed.lineItems.filter((li) => li.sku.trim()),
          })
          await reloadInventoryFromApi()
          if (detail.purchaseId) options?.onPurchaseUpdated?.(detail.purchaseId)
          return { ok: true, message: 'Stock ingresado correctamente.' }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'No se pudo confirmar el ingreso.'
          return { ok: false, message }
        }
      }

      const { receiveStockForReceipt } = await import('@/lib/stock-service')
      const lines = detail.lineItems
        .filter((li) => li.sku.trim() && li.quantity > 0)
        .map((li) => ({
          id: li.id,
          sku: li.sku.trim(),
          productId: li.productId,
          quantity: li.quantity,
          description: li.product,
        }))
      const result = receiveStockForReceipt(detail.number, lines, detail.id)
      if (!result.ok) {
        return { ok: false, message: result.message ?? 'No se pudo ingresar stock.' }
      }

      const confirmedAt = new Date().toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      const confirmed: StockReceiptDetail = {
        ...detail,
        status: 'Confirmado',
        confirmedAt,
      }
      await updateReceiptFromDetail(confirmed)
      if (detail.purchaseId) options?.onPurchaseUpdated?.(detail.purchaseId)
      return { ok: true, message: result.message }
    },
    [save, updateReceiptFromDetail, userReceipts],
  )

  const archiveReceipt = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        let lineItems: StockReceiptDetail['lineItems'] = []
        try {
          const detail = await getStockReceiptApi(id)
          lineItems = detail.lineItems.filter((li) => li.sku.trim())
        } catch {
          /* sin líneas en memoria */
        }
        const snapshot = await archiveStockReceiptApi(id)
        if (lineItems.length > 0) {
          const { syncRegistryStockReceiptLines } = await import(
            '@/data/stock-receipt-lines-registry-store'
          )
          syncRegistryStockReceiptLines({ [id]: lineItems })
        }
        const nextStore: ArchivedStockReceiptStore = {
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        }
        persistArchive(nextStore, userReceipts)
        save(userReceipts.filter((r) => r.id !== id))
        return
      }
      const next: ArchivedStockReceiptStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userReceipts) },
      }
      persistArchive(next, userReceipts)
      save(userReceipts.filter((r) => r.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userReceipts],
  )

  const archiveReceipts = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await archiveReceipt(id)
    },
    [archiveReceipt],
  )

  const restoreReceipt = useCallback(
    async (id: string) => {
      if (useApi) {
        const item = await restoreStockReceiptApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next, userReceipts)
        if (!userReceipts.some((r) => r.id === id)) save([item, ...userReceipts])
        return
      }
      const record = archiveStore[id]
      if (!record) return
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next, userReceipts)
      const item = stampRecordAuditOnUpdate(
        record.snapshot ?? snapshotForArchive(id, userReceipts),
      )
      if (!userReceipts.some((r) => r.id === id)) save([item, ...userReceipts])
    },
    [archiveStore, persistArchive, save, userReceipts],
  )

  const restoreReceipts = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreReceipt(id)
    },
    [restoreReceipt],
  )

  const permanentlyDeleteReceipt = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeleteStockReceiptApi(id)
        await reloadInventoryFromApi()
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next, userReceipts)
      purgeStockReceiptLocalData(id)
    },
    [archiveStore, persistArchive, userReceipts],
  )

  const permanentlyDeleteReceipts = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const next = { ...archiveStore }
      for (const id of unique) {
        if (!next[id]) continue
        if (useApi) {
          await permanentlyDeleteStockReceiptApi(id)
        }
        delete next[id]
        purgeStockReceiptLocalData(id)
      }
      if (useApi && unique.some((id) => archiveStore[id])) {
        await reloadInventoryFromApi()
      }
      persistArchive(next, userReceipts)
    },
    [archiveStore, persistArchive, userReceipts],
  )

  const allReceipts = useMemo(
    () => userReceipts,
    [userReceipts],
  )

  const archivedReceipts = useMemo(
    () => entriesFromStore(archiveStore, userReceipts),
    [archiveStore, userReceipts],
  )

  const value = useMemo<StockReceiptsRegistryValue>(
    () => ({
      userReceipts,
      allReceipts,
      archivedReceipts,
      findById,
      addReceipt,
      updateReceiptFromDetail,
      confirmReceipt,
      archiveReceipt,
      archiveReceipts,
      restoreReceipt,
      restoreReceipts,
      permanentlyDeleteReceipt,
      permanentlyDeleteReceipts,
      isArchived,
      reloadFromApi,
    }),
    [
      userReceipts,
      allReceipts,
      archivedReceipts,
      findById,
      addReceipt,
      updateReceiptFromDetail,
      confirmReceipt,
      archiveReceipt,
      archiveReceipts,
      restoreReceipt,
      restoreReceipts,
      permanentlyDeleteReceipt,
      permanentlyDeleteReceipts,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <StockReceiptsRegistryContext.Provider value={value}>
      {children}
    </StockReceiptsRegistryContext.Provider>
  )
}
