import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archivePruebaSolicitudApi,
  createPruebaSolicitudApi,
  listPruebasSolicitudApi,
  permanentlyDeletePruebaSolicitudApi,
  restorePruebaSolicitudApi,
} from '@/api/pruebas-solicitud'
import { PruebasSolicitudRegistryContext } from '@/contexts/pruebas-solicitud-registry-context'
import type { ArchivedPruebaEntry } from '@/contexts/pruebas-solicitud-registry-context'
import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'

const useApi = isApiEnabled()

export function PruebasSolicitudRegistryProvider({ children }: { children: ReactNode }) {
  const [allPruebas, setAllPruebas] = useState<PruebaSolicitudListItem[]>([])
  const [archiveStore, setArchiveStore] = useState<Record<string, ArchivedPruebaEntry>>({})
  const [registryHydrated, setRegistryHydrated] = useState(!useApi)

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listPruebasSolicitudApi(false),
      listPruebasSolicitudApi(true),
    ])
    setAllPruebas(active)
    setArchiveStore(archivedStoreFromList(archived))
    setRegistryHydrated(true)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'pruebas_solicitud' })

  const archivedPruebas = useMemo(
    () =>
      Object.values(archiveStore).sort((a, b) => b.archivedAt - a.archivedAt),
    [archiveStore],
  )

  const isArchived = useCallback(
    (id: string) => Boolean(archiveStore[id]),
    [archiveStore],
  )

  const addPrueba = useCallback(
    async (body: { solicitudId: string; description?: string; executedAt?: string }) => {
      const created = await createPruebaSolicitudApi(body)
      setAllPruebas((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const archivePrueba = useCallback(async (id: string) => {
    await archivePruebaSolicitudApi(id)
    setAllPruebas((prev) => {
      const snapshot = prev.find((p) => p.id === id)
      if (snapshot) {
        setArchiveStore((store) => ({
          ...store,
          [id]: { id, archivedAt: Date.now(), snapshot },
        }))
      }
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const archivePruebas = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      for (const id of unique) {
        await archivePrueba(id)
      }
    },
    [archivePrueba],
  )

  const restorePrueba = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      const item = await restorePruebaSolicitudApi(id)
      const next = { ...archiveStore }
      delete next[id]
      setArchiveStore(next)
      if (!allPruebas.some((p) => p.id === id)) {
        setAllPruebas((prev) => [item, ...prev])
      }
    },
    [archiveStore, allPruebas],
  )

  const restorePruebas = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restorePrueba(id)
    },
    [restorePrueba],
  )

  const permanentlyDeletePrueba = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      await permanentlyDeletePruebaSolicitudApi(id)
      const next = { ...archiveStore }
      delete next[id]
      setArchiveStore(next)
    },
    [archiveStore],
  )

  const permanentlyDeletePruebas = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      for (const id of unique) {
        if (!archiveStore[id]) continue
        await permanentlyDeletePruebaSolicitudApi(id)
      }
      const next = { ...archiveStore }
      for (const id of unique) delete next[id]
      setArchiveStore(next)
    },
    [archiveStore],
  )

  const value = useMemo(
    () => ({
      allPruebas,
      archivedPruebas,
      registryHydrated,
      reloadFromApi,
      addPrueba,
      archivePrueba,
      archivePruebas,
      restorePrueba,
      restorePruebas,
      permanentlyDeletePrueba,
      permanentlyDeletePruebas,
      isArchived,
    }),
    [
      allPruebas,
      archivedPruebas,
      registryHydrated,
      reloadFromApi,
      addPrueba,
      archivePrueba,
      archivePruebas,
      restorePrueba,
      restorePruebas,
      permanentlyDeletePrueba,
      permanentlyDeletePruebas,
      isArchived,
    ],
  )

  return (
    <PruebasSolicitudRegistryContext.Provider value={value}>
      {children}
    </PruebasSolicitudRegistryContext.Provider>
  )
}
