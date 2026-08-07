import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveBoletaApi,
  boletaDetailToApiBody,
  boletaFormToApiBody,
  createBoletaApi,
  listBoletasApi,
  permanentlyDeleteBoletaApi,
  patchBoletaStatusApi,
  restoreBoletaApi,
  updateBoletaApi,
} from '@/api/boletas'
import {
  BoletasRegistryContext,
  type ArchivedBoletaEntry,
} from '@/contexts/boletas-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { resolveBoletaListItem } from '@/data/boleta-detail.mock'
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import type { BoletaListItem } from '@/data/boletas.mock'
import { syncRegistryBoletas } from '@/data/boletas-registry-store'
import {
  formValuesToBoletaDetailOverride,
  formValuesToBoletaListItem,
  type CreateBoletaFormValues,
} from '@/lib/boleta-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { persistBoletaDetailOverride, removeBoletaDetailOverride } from '@/lib/boleta-detail-storage'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import { listItemFromBoletaDetail } from '@/lib/boleta-form'
import {
  type ArchivedBoletaStore,
  archivedBoletaIds,
  loadArchivedBoletaStore,
  purgeExpiredBoletaStore,
  saveArchivedBoletaStore,
} from '@/lib/boleta-archive'
import { removeBoletaJourneyOverride } from '@/lib/boleta-journey'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { dispatchInventoryUpdated } from '@/lib/realtime-events'
import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-boletas`

function purgeBoletaLocalData(boletaId: string) {
  const id = boletaId.trim()
  if (!id) return
  purgeEntityAttachments('boleta', id, 'boleta')
  removeBoletaDetailOverride(id)
  removeBoletaJourneyOverride(id)
}

function loadStored(): BoletaListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BoletaListItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persistLocal(boletas: BoletaListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boletas))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(id: string, userBoletas: BoletaListItem[]): BoletaListItem {
  const fromUser = userBoletas.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolveBoletaListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedBoletaStore,
  userBoletas: BoletaListItem[],
): ArchivedBoletaEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      boleta: record.snapshot ?? snapshotForArchive(record.id, userBoletas),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function BoletasRegistryProvider({ children }: { children: ReactNode }) {
  const [userBoletas, setUserBoletas] = useState<BoletaListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStored()
    syncRegistryBoletas(loaded)
    return loaded
  })

  const [archiveStore, setArchiveStore] = useState<ArchivedBoletaStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedBoletaStore()
    const { store } = purgeExpiredBoletaStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedBoletaStore(store)
    }
    return store
  })

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listBoletasApi(false),
      listBoletasApi(true),
    ])
    syncRegistryBoletas(active)
    setUserBoletas(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'boletas' })

  const archivedIds = useMemo(() => archivedBoletaIds(archiveStore), [archiveStore])

  const save = useCallback((next: BoletaListItem[]) => {
    syncRegistryBoletas(next)
    setUserBoletas(next)
    if (!useApi) persistLocal(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedBoletaStore) => {
    if (!useApi) saveArchivedBoletaStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userBoletas.find((o) => o.id === id),
    [userBoletas],
  )

  const addBoleta = useCallback(
    async (values: CreateBoletaFormValues) => {
      if (useApi) {
        const detail = await createBoletaApi(boletaFormToApiBody(values))
        const item = listItemFromBoletaDetail(detail)
        save([item, ...userBoletas])
        return item
      }
      const item = formValuesToBoletaListItem(values)
      persistBoletaDetailOverride(item.id, formValuesToBoletaDetailOverride(values))
      save([item, ...userBoletas])
      return item
    },
    [save, userBoletas],
  )

  const isArchived = useCallback((id: string) => archivedIds.has(id), [archivedIds])

  const updateBoletaFromDetail = useCallback(
    async (detail: BoletaDetail) => {
      const list = listItemFromBoletaDetail(detail)
      if (useApi) {
        await updateBoletaApi(detail.id, boletaDetailToApiBody(detail))
        if (userBoletas.some((o) => o.id === detail.id)) {
          save(userBoletas.map((o) => (o.id === detail.id ? list : o)))
        }
        return
      }
      const totals = computeInvoiceTotals(detail.lineItems)
      persistBoletaDetailOverride(detail.id, {
        lineItems: detail.lineItems,
        subtotal: totals.subtotal,
        taxableSubtotal: totals.taxableSubtotal,
        exemptSubtotal: totals.exemptSubtotal,
        taxPercent: totals.taxPercent,
        taxAmount: totals.taxAmount,
        amount: totals.amount,
        notes: detail.internalNotes,
      })
      if (userBoletas.some((o) => o.id === detail.id)) {
        save(userBoletas.map((o) => (o.id === detail.id ? list : o)))
      }
    },
    [save, userBoletas],
  )

  const patchBoletaStatus = useCallback(
    async (id: string, status: string) => {
      if (useApi) {
        const detail = await patchBoletaStatusApi(id, { status })
        dispatchInventoryUpdated()
        const list = listItemFromBoletaDetail(detail)
        if (userBoletas.some((o) => o.id === id)) {
          save(userBoletas.map((o) => (o.id === id ? list : o)))
        }
        return detail
      }
      const current = userBoletas.find((o) => o.id === id)
      if (!current) {
        throw new Error('Boleta no encontrada')
      }
      const detail = {
        ...resolveBoletaListItem(id),
        ...current,
        status: status as BoletaDetail['status'],
      } as BoletaDetail
      await updateBoletaFromDetail(detail)
      dispatchInventoryUpdated()
      return detail
    },
    [save, updateBoletaFromDetail, userBoletas],
  )

  const archiveBoleta = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveBoletaApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userBoletas.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedBoletaStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userBoletas) },
      }
      persistArchive(next)
      save(userBoletas.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userBoletas],
  )

  const archiveBoletas = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveBoleta(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedBoletaStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userBoletas),
        }
      }
      persistArchive(next)
      save(userBoletas.filter((o) => !unique.includes(o.id)))
    },
    [archiveBoleta, archiveStore, archivedIds, persistArchive, save, userBoletas],
  )

  const restoreBoleta = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreBoletaApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userBoletas.some((o) => o.id === id)) save([item, ...userBoletas])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userBoletas),
      )
      if (!userBoletas.some((o) => o.id === id)) save([item, ...userBoletas])
    },
    [archiveStore, persistArchive, save, userBoletas],
  )

  const restoreBoletas = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreBoleta(id)
    },
    [restoreBoleta],
  )

  const permanentlyDeleteBoleta = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeleteBoletaApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgeBoletaLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteBoletas = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) {
          await permanentlyDeleteBoletaApi(id)
        }
        delete nextStore[id]
        purgeBoletaLocalData(id)
      }
      persistArchive(nextStore)
    },
    [archiveStore, persistArchive],
  )

  useEffect(() => {
    if (useApi) return
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredBoletaStore(archiveStore)
      if (purgedIds.length === 0) return
      saveArchivedBoletaStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeBoletaLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allBoletas = useMemo(
    () => userBoletas.filter((o) => !archivedIds.has(o.id)),
    [userBoletas, archivedIds],
  )

  const archivedBoletas = useMemo(
    () => entriesFromStore(archiveStore, userBoletas),
    [archiveStore, userBoletas],
  )

  const value = useMemo(
    () => ({
      userBoletas,
      allBoletas,
      archivedBoletas,
      findById,
      addBoleta,
      updateBoletaFromDetail,
      patchBoletaStatus,
      archiveBoleta,
      archiveBoletas,
      restoreBoleta,
      restoreBoletas,
      permanentlyDeleteBoleta,
      permanentlyDeleteBoletas,
      isArchived,
      reloadFromApi,
    }),
    [
      userBoletas,
      allBoletas,
      archivedBoletas,
      findById,
      addBoleta,
      updateBoletaFromDetail,
      patchBoletaStatus,
      archiveBoleta,
      archiveBoletas,
      restoreBoleta,
      restoreBoletas,
      permanentlyDeleteBoleta,
      permanentlyDeleteBoletas,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <BoletasRegistryContext.Provider value={value}>
      {children}
    </BoletasRegistryContext.Provider>
  )
}
