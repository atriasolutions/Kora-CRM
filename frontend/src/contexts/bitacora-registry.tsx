import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveBitacoraApi,
  bitacoraDetailToApiBody,
  bitacoraFormToApiBody,
  createBitacoraApi,
  listBitacoraApi,
  permanentlyDeleteBitacoraApi,
  restoreBitacoraApi,
  updateBitacoraApi,
} from '@/api/bitacora'
import { BitacoraRegistryContext } from '@/contexts/bitacora-registry-context'
import type { ArchivedBitacoraEntry } from '@/contexts/bitacora-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { minimalBitacoraListItem } from '@/lib/production-empty-data'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  applyFormValuesToBitacora,
  formValuesToBitacoraListItem,
  listItemFromBitacoraDetail,
  type BitacoraFormValues,
} from '@/lib/bitacora-form'
import {
  type ArchivedBitacoraStore,
  archivedBitacoraIds,
  loadArchivedBitacoraStore,
  purgeExpiredFromStore,
  saveArchivedBitacoraStore,
} from '@/lib/bitacora-archive'
import { purgeBitacoraLocalData } from '@/lib/bitacora-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-bitacora`

function loadStored(): BitacoraListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BitacoraListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistLocal(items: BitacoraListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(
  id: string,
  userBitacora: BitacoraListItem[],
): BitacoraListItem {
  return userBitacora.find((b) => b.id === id) ?? minimalBitacoraListItem(id)
}

function entriesFromStore(
  store: ArchivedBitacoraStore,
  userBitacora: BitacoraListItem[],
): ArchivedBitacoraEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      entry: record.snapshot ?? snapshotForArchive(record.id, userBitacora),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function BitacoraRegistryProvider({ children }: { children: ReactNode }) {
  const [userBitacora, setUserBitacora] = useState<BitacoraListItem[]>(() => {
    if (useApi) return []
    return loadStored()
  })
  const [archiveStore, setArchiveStore] = useState<ArchivedBitacoraStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedBitacoraStore()
    const { store } = purgeExpiredFromStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedBitacoraStore(store)
    }
    return store
  })
  const [registryHydrated, setRegistryHydrated] = useState(!useApi)

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listBitacoraApi(false),
      listBitacoraApi(true),
    ])
    setUserBitacora(active)
    setArchiveStore(archivedStoreFromList(archived))
    setRegistryHydrated(true)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'bitacora' })

  const archivedIds = useMemo(() => archivedBitacoraIds(archiveStore), [archiveStore])

  const save = useCallback((next: BitacoraListItem[]) => {
    setUserBitacora(next)
    if (!useApi) persistLocal(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedBitacoraStore) => {
    if (!useApi) saveArchivedBitacoraStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userBitacora.find((b) => b.id === id),
    [userBitacora],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const addBitacora = useCallback(
    async (values: BitacoraFormValues) => {
      if (useApi) {
        const detail = await createBitacoraApi(bitacoraFormToApiBody(values))
        const item = listItemFromBitacoraDetail(detail)
        save([item, ...userBitacora])
        return item
      }
      const item = formValuesToBitacoraListItem(values)
      save([item, ...userBitacora])
      return item
    },
    [save, userBitacora],
  )

  const updateBitacoraFromDetail = useCallback(
    async (detail: BitacoraListItem) => {
      if (useApi) {
        const saved = await updateBitacoraApi(detail.id, bitacoraDetailToApiBody(detail))
        const item = listItemFromBitacoraDetail(saved)
        save(userBitacora.map((b) => (b.id === detail.id ? item : b)))
        return
      }
      save(userBitacora.map((b) => (b.id === detail.id ? detail : b)))
    },
    [save, userBitacora],
  )

  const updateBitacoraFromForm = useCallback(
    async (existing: BitacoraListItem, values: BitacoraFormValues) => {
      const next = applyFormValuesToBitacora(existing, values)
      await updateBitacoraFromDetail(next)
      return next
    },
    [updateBitacoraFromDetail],
  )

  const archiveBitacora = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveBitacoraApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userBitacora.filter((b) => b.id !== id))
        return
      }
      persistArchive({
        ...archiveStore,
        [id]: {
          id,
          archivedAt: Date.now(),
          snapshot: snapshotForArchive(id, userBitacora),
        },
      })
      save(userBitacora.filter((b) => b.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userBitacora],
  )

  const archiveBitacoraEntries = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveBitacora(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedBitacoraStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userBitacora),
        }
      }
      persistArchive(next)
      save(userBitacora.filter((b) => !unique.includes(b.id)))
    },
    [archiveBitacora, archiveStore, archivedIds, persistArchive, save, userBitacora],
  )

  const restoreBitacora = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreBitacoraApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userBitacora.some((b) => b.id === id)) save([item, ...userBitacora])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = record!.snapshot ?? snapshotForArchive(id, userBitacora)
      if (!userBitacora.some((b) => b.id === id)) save([item, ...userBitacora])
    },
    [archiveStore, persistArchive, save, userBitacora],
  )

  const restoreBitacoraEntries = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreBitacora(id)
    },
    [restoreBitacora],
  )

  const permanentlyDeleteBitacora = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) await permanentlyDeleteBitacoraApi(id)
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgeBitacoraLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteBitacoraEntries = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) await permanentlyDeleteBitacoraApi(id)
        delete nextStore[id]
        purgeBitacoraLocalData(id)
      }
      persistArchive(nextStore)
    },
    [archiveStore, persistArchive],
  )

  const deleteBitacora = useCallback(
    async (id: string) => {
      await archiveBitacora(id)
    },
    [archiveBitacora],
  )

  useEffect(() => {
    if (useApi) return
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      saveArchivedBitacoraStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeBitacoraLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allBitacora = useMemo(
    () => userBitacora.filter((b) => !archivedIds.has(b.id)),
    [userBitacora, archivedIds],
  )

  const archivedBitacora = useMemo(
    () => entriesFromStore(archiveStore, userBitacora),
    [archiveStore, userBitacora],
  )

  const value = useMemo(
    () => ({
      userBitacora,
      allBitacora,
      registryHydrated,
      archivedBitacora,
      findById,
      addBitacora,
      updateBitacoraFromDetail,
      updateBitacoraFromForm,
      archiveBitacora,
      archiveBitacoraEntries,
      restoreBitacora,
      restoreBitacoraEntries,
      permanentlyDeleteBitacora,
      permanentlyDeleteBitacoraEntries,
      deleteBitacora,
      isArchived,
      reloadFromApi,
    }),
    [
      userBitacora,
      allBitacora,
      registryHydrated,
      archivedBitacora,
      findById,
      addBitacora,
      updateBitacoraFromDetail,
      updateBitacoraFromForm,
      archiveBitacora,
      archiveBitacoraEntries,
      restoreBitacora,
      restoreBitacoraEntries,
      permanentlyDeleteBitacora,
      permanentlyDeleteBitacoraEntries,
      deleteBitacora,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <BitacoraRegistryContext.Provider value={value}>
      {children}
    </BitacoraRegistryContext.Provider>
  )
}
