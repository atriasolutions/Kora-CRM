import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveSolicitudApi,
  createSolicitudApi,
  permanentlyDeleteSolicitudApi,
  listSolicitudesApi,
  restoreSolicitudApi,
  solicitudDetailToApiBody,
  solicitudFormToApiBody,
  solicitudPatchToApiBody,
  updateSolicitudApi,
} from '@/api/solicitudes'
import {
  SolicitudesRegistryContext,
  type ArchivedSolicitudEntry,
} from '@/contexts/solicitudes-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import {
  minimalSolicitudListItem,
} from '@/lib/production-empty-data'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import {
  formValuesToListItem,
  type CreateSolicitudFormValues,
} from '@/lib/solicitud-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromSolicitudDetail } from '@/lib/solicitud-form'
import {
  type ArchivedSolicitudStore,
  archivedSolicitudIds,
  loadArchivedSolicitudStore,
  purgeExpiredFromStore,
  saveArchivedSolicitudStore,
} from '@/lib/solicitud-archive'
import { purgeSolicitudLocalData } from '@/lib/solicitud-permanent-delete'
import { persistSolicitudFiles } from '@/lib/solicitud-files'
import {
  persistSolicitudDescriptionMedia,
  serializeDescriptionHtml,
} from '@/lib/solicitud-description-media'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-solicitudes`

function loadStored(): SolicitudListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SolicitudListItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persistLocal(solicitudes: SolicitudListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitudes))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(
  id: string,
  userSolicitudes: SolicitudListItem[],
): SolicitudListItem {
  const fromUser = userSolicitudes.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : minimalSolicitudListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedSolicitudStore,
  userSolicitudes: SolicitudListItem[],
): ArchivedSolicitudEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      solicitud: record.snapshot ?? snapshotForArchive(record.id, userSolicitudes),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function SolicitudesRegistryProvider({ children }: { children: ReactNode }) {
  const [userSolicitudes, setUserSolicitudes] = useState<SolicitudListItem[]>(() => {
    if (useApi) return []
    return loadStored()
  })

  const [archiveStore, setArchiveStore] = useState<ArchivedSolicitudStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedSolicitudStore()
    const { store } = purgeExpiredFromStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedSolicitudStore(store)
    }
    return store
  })

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listSolicitudesApi(false),
      listSolicitudesApi(true),
    ])
    setUserSolicitudes(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedSolicitudIds(archiveStore), [archiveStore])

  const save = useCallback(
    (next: SolicitudListItem[]) => {
      setUserSolicitudes(next)
      if (!useApi) persistLocal(next)
    },
    [],
  )

  const persistArchive = useCallback((store: ArchivedSolicitudStore) => {
    if (!useApi) saveArchivedSolicitudStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userSolicitudes.find((o) => o.id === id),
    [userSolicitudes],
  )

  const addSolicitud = useCallback(
    async (
      values: CreateSolicitudFormValues,
      descriptionFiles: import('@/lib/solicitud-files').SolicitudFile[] = [],
    ) => {
      const description = serializeDescriptionHtml(values.description)
      const payload = { ...values, description }
      if (useApi) {
        const detail = await createSolicitudApi(solicitudFormToApiBody(payload))
        let files = descriptionFiles
        let finalDescription = description
        if (descriptionFiles.length > 0) {
          const media = await persistSolicitudDescriptionMedia(
            detail.id,
            detail.title,
            values.description,
            descriptionFiles,
            persistSolicitudFiles,
          )
          files = media.files
          finalDescription = media.description
          if (finalDescription !== description) {
            await updateSolicitudApi(detail.id, { description: finalDescription })
          }
        }
        const item = listItemFromSolicitudDetail({
          ...(detail as SolicitudDetail),
          description: finalDescription,
          files,
        })
        save([item, ...userSolicitudes])
        return item
      }
      const item = formValuesToListItem(payload)
      save([item, ...userSolicitudes])
      return item
    },
    [save, userSolicitudes],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateSolicitudFromDetail = useCallback(
    async (detail: SolicitudDetail): Promise<SolicitudDetail> => {
      const list = listItemFromSolicitudDetail(detail)
      if (useApi) {
        const saved = await updateSolicitudApi(detail.id, solicitudDetailToApiBody(detail))
        if (userSolicitudes.some((p) => p.id === detail.id)) {
          save(userSolicitudes.map((p) => (p.id === detail.id ? list : p)))
        }
        return saved as SolicitudDetail
      }
      if (userSolicitudes.some((p) => p.id === detail.id)) {
        save(userSolicitudes.map((p) => (p.id === detail.id ? list : p)))
      }
      return detail
    },
    [save, userSolicitudes],
  )

  const updateSolicitud = useCallback(
    async (id: string, patch: Partial<SolicitudListItem>) => {
      const apiBody = solicitudPatchToApiBody(patch)
      const hasApiFields = Object.keys(apiBody).length > 0
      if (useApi && hasApiFields) {
        await updateSolicitudApi(id, apiBody)
      }
      const idx = userSolicitudes.findIndex((p) => p.id === id)
      if (idx >= 0) {
        save(
          userSolicitudes.map((p) =>
            p.id === id ? stampRecordAuditOnUpdate({ ...p, ...patch }) : p,
          ),
        )
      }
    },
    [save, userSolicitudes],
  )

  const archiveSolicitud = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveSolicitudApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userSolicitudes.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedSolicitudStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userSolicitudes) },
      }
      persistArchive(next)
      save(userSolicitudes.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userSolicitudes],
  )

  const archiveSolicitudes = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveSolicitud(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedSolicitudStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userSolicitudes),
        }
      }
      persistArchive(next)
      save(userSolicitudes.filter((o) => !unique.includes(o.id)))
    },
    [archiveSolicitud, archiveStore, archivedIds, persistArchive, save, userSolicitudes],
  )

  const restoreSolicitud = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreSolicitudApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userSolicitudes.some((o) => o.id === id)) save([item, ...userSolicitudes])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userSolicitudes),
      )
      if (!userSolicitudes.some((o) => o.id === id)) save([item, ...userSolicitudes])
    },
    [archiveStore, persistArchive, save, userSolicitudes],
  )

  const restoreSolicitudes = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreSolicitud(id)
    },
    [restoreSolicitud],
  )

  const permanentlyDeleteSolicitud = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeleteSolicitudApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgeSolicitudLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteSolicitudes = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) {
          await permanentlyDeleteSolicitudApi(id)
        }
        delete nextStore[id]
        purgeSolicitudLocalData(id)
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
      saveArchivedSolicitudStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeSolicitudLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allSolicitudes = useMemo(
    () => userSolicitudes.filter((o) => !archivedIds.has(o.id)),
    [userSolicitudes, archivedIds],
  )

  const archivedSolicitudes = useMemo(
    () => entriesFromStore(archiveStore, userSolicitudes),
    [archiveStore, userSolicitudes],
  )

  const value = useMemo(
    () => ({
      userSolicitudes,
      allSolicitudes,
      archivedSolicitudes,
      findById,
      addSolicitud,
      updateSolicitudFromDetail,
      updateSolicitud,
      archiveSolicitud,
      archiveSolicitudes,
      restoreSolicitud,
      restoreSolicitudes,
      permanentlyDeleteSolicitud,
      permanentlyDeleteSolicitudes,
      isArchived,
      reloadFromApi,
    }),
    [
      userSolicitudes,
      allSolicitudes,
      archivedSolicitudes,
      findById,
      addSolicitud,
      updateSolicitudFromDetail,
      updateSolicitud,
      archiveSolicitud,
      archiveSolicitudes,
      restoreSolicitud,
      restoreSolicitudes,
      permanentlyDeleteSolicitud,
      permanentlyDeleteSolicitudes,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <SolicitudesRegistryContext.Provider value={value}>
      {children}
    </SolicitudesRegistryContext.Provider>
  )
}
