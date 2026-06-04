import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveInvoiceApi,
  createInvoiceApi,
  invoiceDetailToApiBody,
  invoiceFormToApiBody,
  listInvoicesApi,
  permanentlyDeleteInvoiceApi,
  patchInvoiceStatusApi,
  restoreInvoiceApi,
  updateInvoiceApi,
} from '@/api/invoices'
import {
  InvoicesRegistryContext,
  type ArchivedInvoiceEntry,
} from '@/contexts/invoices-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { resolveInvoiceListItem } from '@/data/invoice-detail.mock'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import type { InvoiceListItem } from '@/data/invoices.mock'
import { syncRegistryInvoices } from '@/data/invoices-registry-store'
import {
  formValuesToDetailOverride,
  formValuesToListItem,
  type CreateInvoiceFormValues,
} from '@/lib/invoice-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { persistInvoiceDetailOverride } from '@/lib/invoice-detail-storage'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import { listItemFromInvoiceDetail } from '@/lib/invoice-form'
import {
  type ArchivedInvoiceStore,
  archivedInvoiceIds,
  loadArchivedInvoiceStore,
  purgeExpiredFromStore,
  saveArchivedInvoiceStore,
} from '@/lib/invoice-archive'
import { purgeInvoiceLocalData } from '@/lib/invoice-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { dispatchInventoryUpdated } from '@/lib/realtime-events'
const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-invoices`

function loadStored(): InvoiceListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InvoiceListItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persistLocal(invoices: InvoiceListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(
  id: string,
  userInvoices: InvoiceListItem[],
): InvoiceListItem {
  const fromUser = userInvoices.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolveInvoiceListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedInvoiceStore,
  userInvoices: InvoiceListItem[],
): ArchivedInvoiceEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      invoice: record.snapshot ?? snapshotForArchive(record.id, userInvoices),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function InvoicesRegistryProvider({ children }: { children: ReactNode }) {
  const [userInvoices, setUserInvoices] = useState<InvoiceListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStored()
    syncRegistryInvoices(loaded)
    return loaded
  })

  const [archiveStore, setArchiveStore] = useState<ArchivedInvoiceStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedInvoiceStore()
    const { store } = purgeExpiredFromStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedInvoiceStore(store)
    }
    return store
  })

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listInvoicesApi(false),
      listInvoicesApi(true),
    ])
    syncRegistryInvoices(active)
    setUserInvoices(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedInvoiceIds(archiveStore), [archiveStore])

  const save = useCallback(
    (next: InvoiceListItem[]) => {
      syncRegistryInvoices(next)
      setUserInvoices(next)
      if (!useApi) persistLocal(next)
    },
    [],
  )

  const persistArchive = useCallback((store: ArchivedInvoiceStore) => {
    if (!useApi) saveArchivedInvoiceStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userInvoices.find((o) => o.id === id),
    [userInvoices],
  )

  const addInvoice = useCallback(
    async (values: CreateInvoiceFormValues) => {
      if (useApi) {
        const detail = await createInvoiceApi(invoiceFormToApiBody(values))
        const item = listItemFromInvoiceDetail(detail as InvoiceDetail)
        save([item, ...userInvoices])
        return item
      }
      const item = formValuesToListItem(values)
      persistInvoiceDetailOverride(item.id, formValuesToDetailOverride(values))
      save([item, ...userInvoices])
      return item
    },
    [save, userInvoices],
  )

  const addInvoices = useCallback(
    async (valuesList: CreateInvoiceFormValues[]) => {
      if (useApi) {
        const items: InvoiceListItem[] = []
        for (const values of valuesList) {
          const detail = await createInvoiceApi(invoiceFormToApiBody(values))
          items.push(listItemFromInvoiceDetail(detail))
        }
        save([...items, ...userInvoices])
        return items
      }
      const items = valuesList.map((v) => {
        const item = formValuesToListItem(v)
        persistInvoiceDetailOverride(item.id, formValuesToDetailOverride(v))
        return item
      })
      save([...items, ...userInvoices])
      return items
    },
    [save, userInvoices],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateInvoiceFromDetail = useCallback(
    async (detail: InvoiceDetail) => {
      const list = listItemFromInvoiceDetail(detail)
      if (useApi) {
        await updateInvoiceApi(detail.id, invoiceDetailToApiBody(detail))
        if (userInvoices.some((o) => o.id === detail.id)) {
          save(userInvoices.map((o) => (o.id === detail.id ? list : o)))
        }
        return
      }
      const totals = computeInvoiceTotals(detail.lineItems)
      persistInvoiceDetailOverride(detail.id, {
        lineItems: detail.lineItems,
        subtotal: totals.subtotal,
        taxableSubtotal: totals.taxableSubtotal,
        exemptSubtotal: totals.exemptSubtotal,
        taxPercent: totals.taxPercent,
        taxAmount: totals.taxAmount,
        amount: totals.amount,
        invoiceSource: detail.quoteId ? 'cotizacion' : 'directa',
      })
      if (userInvoices.some((o) => o.id === detail.id)) {
        save(userInvoices.map((o) => (o.id === detail.id ? list : o)))
      }
    },
    [save, userInvoices],
  )

  const patchInvoiceStatus = useCallback(
    async (id: string, status: string, siiNumber?: string) => {
      if (useApi) {
        const detail = await patchInvoiceStatusApi(id, { status, siiNumber })
        dispatchInventoryUpdated()
        const list = listItemFromInvoiceDetail(detail)
        if (userInvoices.some((o) => o.id === id)) {
          save(userInvoices.map((o) => (o.id === id ? list : o)))
        }
        return detail
      }
      const current = userInvoices.find((o) => o.id === id)
      if (!current) {
        throw new Error('Factura no encontrada')
      }
      const detail = {
        ...resolveInvoiceListItem(id),
        ...current,
        status: status as InvoiceDetail['status'],
        siiNumber,
      } as InvoiceDetail
      await updateInvoiceFromDetail(detail)
      dispatchInventoryUpdated()
      return detail
    },
    [save, updateInvoiceFromDetail, userInvoices],
  )

  const archiveInvoice = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveInvoiceApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userInvoices.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedInvoiceStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userInvoices) },
      }
      persistArchive(next)
      save(userInvoices.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userInvoices],
  )

  const archiveInvoices = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveInvoice(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedInvoiceStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userInvoices),
        }
      }
      persistArchive(next)
      save(userInvoices.filter((o) => !unique.includes(o.id)))
    },
    [archiveInvoice, archiveStore, archivedIds, persistArchive, save, userInvoices],
  )

  const restoreInvoice = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreInvoiceApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userInvoices.some((o) => o.id === id)) save([item, ...userInvoices])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userInvoices),
      )
      if (!userInvoices.some((o) => o.id === id)) save([item, ...userInvoices])
    },
    [archiveStore, persistArchive, save, userInvoices],
  )

  const restoreInvoices = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreInvoice(id)
    },
    [restoreInvoice],
  )

  const permanentlyDeleteInvoice = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeleteInvoiceApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgeInvoiceLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteInvoices = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) {
          await permanentlyDeleteInvoiceApi(id)
        }
        delete nextStore[id]
        purgeInvoiceLocalData(id)
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
      saveArchivedInvoiceStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeInvoiceLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allInvoices = useMemo(
    () =>
      userInvoices.filter(
        (o) => !archivedIds.has(o.id),
      ),
    [userInvoices, archivedIds],
  )

  const archivedInvoices = useMemo(
    () => entriesFromStore(archiveStore, userInvoices),
    [archiveStore, userInvoices],
  )

  const value = useMemo(
    () => ({
      userInvoices,
      allInvoices,
      archivedInvoices,
      findById,
      addInvoice,
      addInvoices,
      updateInvoiceFromDetail,
      patchInvoiceStatus,
      archiveInvoice,
      archiveInvoices,
      restoreInvoice,
      restoreInvoices,
      permanentlyDeleteInvoice,
      permanentlyDeleteInvoices,
      isArchived,
      reloadFromApi,
    }),
    [
      userInvoices,
      allInvoices,
      archivedInvoices,
      findById,
      addInvoice,
      addInvoices,
      updateInvoiceFromDetail,
      patchInvoiceStatus,
      archiveInvoice,
      archiveInvoices,
      restoreInvoice,
      restoreInvoices,
      permanentlyDeleteInvoice,
      permanentlyDeleteInvoices,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <InvoicesRegistryContext.Provider value={value}>
      {children}
    </InvoicesRegistryContext.Provider>
  )
}
