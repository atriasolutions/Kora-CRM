import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archivePurchaseApi,
  createPurchaseApi,
  getPurchaseApi,
  listPurchasesApi,
  purchaseDetailToApiBody,
  purchaseFormToApiBody,
  permanentlyDeletePurchaseApi,
  restorePurchaseApi,
  updatePurchaseApi,
} from '@/api/purchases'
import {
  PurchasesRegistryContext,
  type ArchivedPurchaseEntry,
} from '@/contexts/purchases-registry-context'
import { resolvePurchaseListItem } from '@/data/purchase-detail.mock'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { syncRegistryPurchases } from '@/data/purchases-registry-store'
import { mergePurchaseLinesWithIngresos } from '@/lib/purchase-lines'
import { isPurchaseOpenForInTransit } from '@/lib/inventory-in-transit'
import {
  listItemFromPurchaseDetail,
  purchaseFormValuesToDetailOverride,
  purchaseFormValuesToListItem,
  type PurchaseFormValues,
} from '@/lib/purchase-form'
import { persistPurchaseDetailOverride } from '@/lib/purchase-detail-storage'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import {
  type ArchivedPurchaseStore,
  archivedPurchaseIds,
  purgeExpiredFromStore,
} from '@/lib/purchase-archive'
import { normalizePurchaseDetailFromApi } from '@/lib/purchase-detail-normalize'
import { purgePurchaseLocalData } from '@/lib/purchase-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()

function snapshotForArchive(
  id: string,
  userPurchases: PurchaseListItem[],
): PurchaseListItem {
  const fromUser = userPurchases.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolvePurchaseListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedPurchaseStore,
  userPurchases: PurchaseListItem[],
): ArchivedPurchaseEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      purchase: record.snapshot ?? snapshotForArchive(record.id, userPurchases),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function PurchasesRegistryProvider({ children }: { children: ReactNode }) {
  const [userPurchases, setUserPurchases] = useState<PurchaseListItem[]>([])
  const [archiveStore, setArchiveStore] = useState<ArchivedPurchaseStore>({})

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listPurchasesApi(false),
      listPurchasesApi(true),
    ])
    syncRegistryPurchases(active)
    setUserPurchases(active)

    const lineEntries = await Promise.all(
      active.map(async (p) => {
        try {
          const detail = await getPurchaseApi(p.id)
          return [p.id, detail.lineItems ?? []] as const
        } catch {
          return [p.id, []] as const
        }
      }),
    )
    mergePurchaseLinesWithIngresos(Object.fromEntries(lineEntries))

    const openForTransit = active.filter((p) =>
      isPurchaseOpenForInTransit(p.status),
    )

    if (useApi) {
      const { listStockReceiptsApi } = await import('@/api/stock-receipts')
      const { syncStockReceiptLinesForReceipts } = await import(
        '@/lib/sync-stock-receipt-lines-registry'
      )
      const openIds = new Set(openForTransit.map((p) => p.id))
      const [activeReceipts, archivedReceipts] = await Promise.all([
        listStockReceiptsApi(false),
        listStockReceiptsApi(true),
      ])
      const receiptsForOpenPurchases = [...activeReceipts, ...archivedReceipts].filter(
        (r) => r.purchaseId && openIds.has(r.purchaseId),
      )
      await syncStockReceiptLinesForReceipts(receiptsForOpenPurchases, {
        confirmedOnly: false,
      })
    }

    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedPurchaseIds(archiveStore), [archiveStore])

  const save = useCallback((next: PurchaseListItem[]) => {
    syncRegistryPurchases(next)
    setUserPurchases(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedPurchaseStore) => {
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userPurchases.find((o) => o.id === id),
    [userPurchases],
  )

  const addPurchase = useCallback(
    async (values: PurchaseFormValues) => {
      if (useApi) {
        const raw = await createPurchaseApi(purchaseFormToApiBody(values))
        const detail = normalizePurchaseDetailFromApi(raw)
        const item = listItemFromPurchaseDetail(detail)
        if (isPurchaseOpenForInTransit(item.status)) {
          mergePurchaseLinesWithIngresos({ [item.id]: detail.lineItems })
        }
        save([item, ...userPurchases])
        return item
      }
      const item = purchaseFormValuesToListItem(values, undefined, {
        existingReferences: userPurchases.map((p) => p.reference),
      })
      const override = purchaseFormValuesToDetailOverride(values, item.id)
      persistPurchaseDetailOverride(item.id, override)
      if (isPurchaseOpenForInTransit(item.status)) {
        mergePurchaseLinesWithIngresos({ [item.id]: override.lineItems })
      }
      save([item, ...userPurchases])
      return item
    },
    [save, userPurchases],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updatePurchaseFromDetail = useCallback(
    async (detail: PurchaseDetail): Promise<PurchaseDetail> => {
      const list = listItemFromPurchaseDetail(detail)
      if (useApi) {
        const raw = await updatePurchaseApi(detail.id, purchaseDetailToApiBody(detail))
        const saved = normalizePurchaseDetailFromApi(raw)
        const listFromApi = listItemFromPurchaseDetail(saved)
        save(userPurchases.map((p) => (p.id === detail.id ? listFromApi : p)))
        if (isPurchaseOpenForInTransit(listFromApi.status)) {
          mergePurchaseLinesWithIngresos({ [saved.id]: saved.lineItems })
        }
        return saved
      }
      persistPurchaseDetailOverride(detail.id, {
        description: detail.description,
        expectedDelivery: detail.expectedDelivery,
        paymentTerms: detail.paymentTerms,
        warehouseId: detail.warehouseId,
        warehouse: detail.warehouse,
        deliveryAddress: detail.deliveryAddress,
        supplierContactId: detail.supplierContactId,
        supplierContact: detail.supplierContact,
        supplierEmail: detail.supplierEmail,
        supplierPhone: detail.supplierPhone,
        cancelReason: detail.cancelReason,
        lineItems: detail.lineItems,
        receivedPercent: detail.receivedPercent,
        stage: detail.stage,
        tags: detail.tags,
        reference: list.reference,
        supplier: list.supplier,
        supplierId: list.supplierId,
        productSummary: list.productSummary,
        orderDate: list.orderDate,
        amount: list.amount,
        amountNum: list.amountNum,
        status: list.status,
        owner: list.owner,
      })
      if (userPurchases.some((p) => p.id === detail.id)) {
        save(userPurchases.map((p) => (p.id === detail.id ? list : p)))
      }
      return detail
    },
    [save, userPurchases],
  )

  const archivePurchase = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archivePurchaseApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userPurchases.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedPurchaseStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userPurchases) },
      }
      persistArchive(next)
      save(userPurchases.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userPurchases],
  )

  const archivePurchases = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archivePurchase(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedPurchaseStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userPurchases),
        }
      }
      persistArchive(next)
      save(userPurchases.filter((o) => !unique.includes(o.id)))
    },
    [archivePurchase, archiveStore, archivedIds, persistArchive, save, userPurchases],
  )

  const restorePurchase = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restorePurchaseApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userPurchases.some((o) => o.id === id)) save([item, ...userPurchases])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userPurchases),
      )
      if (!userPurchases.some((o) => o.id === id)) save([item, ...userPurchases])
    },
    [archiveStore, persistArchive, save, userPurchases],
  )

  const restorePurchases = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restorePurchase(id)
    },
    [restorePurchase],
  )

  const permanentlyDeletePurchase = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeletePurchaseApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgePurchaseLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeletePurchases = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) {
          await permanentlyDeletePurchaseApi(id)
        }
        delete nextStore[id]
        purgePurchaseLocalData(id)
      }
      persistArchive(nextStore)
    },
    [archiveStore, persistArchive],
  )

  useEffect(() => {
    if (useApi) return
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      setArchiveStore(store)
      purgedIds.forEach((id) => purgePurchaseLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allPurchases = useMemo(
    () =>
      userPurchases.filter(
        (o) => !archivedIds.has(o.id),
      ),
    [userPurchases, archivedIds],
  )

  const archivedPurchases = useMemo(
    () => entriesFromStore(archiveStore, userPurchases),
    [archiveStore, userPurchases],
  )

  const value = useMemo(
    () => ({
      userPurchases,
      allPurchases,
      archivedPurchases,
      findById,
      addPurchase,
      updatePurchaseFromDetail,
      archivePurchase,
      archivePurchases,
      restorePurchase,
      restorePurchases,
      permanentlyDeletePurchase,
      permanentlyDeletePurchases,
      isArchived,
      reloadFromApi,
    }),
    [
      userPurchases,
      allPurchases,
      archivedPurchases,
      findById,
      addPurchase,
      updatePurchaseFromDetail,
      archivePurchase,
      archivePurchases,
      restorePurchase,
      restorePurchases,
      permanentlyDeletePurchase,
      permanentlyDeletePurchases,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <PurchasesRegistryContext.Provider value={value}>
      {children}
    </PurchasesRegistryContext.Provider>
  )
}
