import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveActivityApi,
  createActivityApi,
  activityDetailToApiBody,
  activityFormToApiBody,
  listActivitiesApi,
  permanentlyDeleteActivityApi,
  restoreActivityApi,
  updateActivityApi,
  activityStatusPatchBody,
} from '@/api/activities'
import {
  ActivitiesRegistryContext,
  type ArchivedActivityEntry,
} from '@/contexts/activities-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { resolveActivityListItem } from '@/data/activity-detail.mock'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { ActivityListItem, ActivityStatus } from '@/data/activities.mock'
import { syncRegistryActivities } from '@/data/activities-registry-store'
import {
  formValuesToListItem,
  type CreateActivityFormValues,
} from '@/lib/activity-create'
import { normalizeActivityDetail } from '@/lib/activity-detail-normalize'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromActivityDetail } from '@/lib/activity-form'
import {
  type ArchivedActivityStore,
  archivedActivityIds,
  loadArchivedActivityStore,
  purgeExpiredFromStore,
  saveArchivedActivityStore,
} from '@/lib/activity-archive'
import { purgeActivityLocalData } from '@/lib/activity-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { ACTIVITIES_UPDATED_EVENT } from '@/lib/realtime-events'
const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-activities`

function loadStored(): ActivityListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ActivityListItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persistLocal(activities: ActivityListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(
  id: string,
  userActivities: ActivityListItem[],
): ActivityListItem {
  const fromUser = userActivities.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolveActivityListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedActivityStore,
  userActivities: ActivityListItem[],
): ArchivedActivityEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      activity: record.snapshot ?? snapshotForArchive(record.id, userActivities),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function ActivitiesRegistryProvider({ children }: { children: ReactNode }) {
  const [registryHydrated, setRegistryHydrated] = useState(!useApi)

  const [userActivities, setUserActivities] = useState<ActivityListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStored()
    syncRegistryActivities(loaded)
    return loaded
  })

  const [archiveStore, setArchiveStore] = useState<ArchivedActivityStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedActivityStore()
    const { store } = purgeExpiredFromStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedActivityStore(store)
    }
    return store
  })

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listActivitiesApi(false),
      listActivitiesApi(true),
    ])
    syncRegistryActivities(active)
    setUserActivities(active)
    setArchiveStore(archivedStoreFromList(archived))
    setRegistryHydrated(true)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'actividades', enabled: false })

  useEffect(() => {
    if (!useApi) return
    const onActivitiesUpdated = () => {
      void reloadFromApi().catch(() => {
        /* ignore: el panel se actualizará en el próximo ciclo */
      })
    }
    window.addEventListener(ACTIVITIES_UPDATED_EVENT, onActivitiesUpdated)
    return () => window.removeEventListener(ACTIVITIES_UPDATED_EVENT, onActivitiesUpdated)
  }, [reloadFromApi])

  const archivedIds = useMemo(() => archivedActivityIds(archiveStore), [archiveStore])

  const save = useCallback(
    (next: ActivityListItem[]) => {
      syncRegistryActivities(next)
      setUserActivities(next)
      if (!useApi) persistLocal(next)
    },
    [],
  )

  const persistArchive = useCallback((store: ArchivedActivityStore) => {
    if (!useApi) saveArchivedActivityStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userActivities.find((o) => o.id === id),
    [userActivities],
  )

  const addActivity = useCallback(
    async (values: CreateActivityFormValues) => {
      if (useApi) {
        const detail = await createActivityApi(activityFormToApiBody(values))
        const item = listItemFromActivityDetail(
          normalizeActivityDetail(detail as ActivityDetail),
        )
        save([item, ...userActivities])
        return item
      }
      const item = formValuesToListItem(values)
      save([item, ...userActivities])
      return item
    },
    [save, userActivities],
  )

  const addActivities = useCallback(
    async (valuesList: CreateActivityFormValues[]) => {
      if (useApi) {
        const items: ActivityListItem[] = []
        for (const values of valuesList) {
          const detail = await createActivityApi(activityFormToApiBody(values))
          items.push(
            listItemFromActivityDetail(normalizeActivityDetail(detail as ActivityDetail)),
          )
        }
        save([...items, ...userActivities])
        return items
      }
      const items = valuesList.map((v) => formValuesToListItem(v))
      save([...items, ...userActivities])
      return items
    },
    [save, userActivities],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const applyActivityDetailUpdate = useCallback(
    (detail: ActivityDetail, saved?: ActivityDetail) => {
      const merged = normalizeActivityDetail(
        saved ? { ...detail, ...saved, id: detail.id } : detail,
      )
      const list = listItemFromActivityDetail(merged)
      if (userActivities.some((o) => o.id === detail.id)) {
        save(userActivities.map((o) => (o.id === detail.id ? list : o)))
      }
      return merged
    },
    [save, userActivities],
  )

  const updateActivityFromDetail = useCallback(
    async (detail: ActivityDetail) => {
      if (useApi) {
        const saved = await updateActivityApi(detail.id, activityDetailToApiBody(detail))
        applyActivityDetailUpdate(detail, saved as ActivityDetail)
        return
      }
      applyActivityDetailUpdate(detail)
    },
    [applyActivityDetailUpdate],
  )

  const updateActivityStatus = useCallback(
    async (detail: ActivityDetail, status: ActivityStatus) => {
      const next = { ...detail, status }
      if (useApi) {
        const saved = await updateActivityApi(detail.id, activityStatusPatchBody(status))
        applyActivityDetailUpdate(next, saved as ActivityDetail)
        return
      }
      applyActivityDetailUpdate(next)
    },
    [applyActivityDetailUpdate],
  )

  const archiveActivity = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveActivityApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userActivities.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedActivityStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userActivities) },
      }
      persistArchive(next)
      save(userActivities.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userActivities],
  )

  const archiveActivities = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveActivity(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedActivityStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userActivities),
        }
      }
      persistArchive(next)
      save(userActivities.filter((o) => !unique.includes(o.id)))
    },
    [archiveActivity, archiveStore, archivedIds, persistArchive, save, userActivities],
  )

  const restoreActivity = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreActivityApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userActivities.some((o) => o.id === id)) save([item, ...userActivities])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userActivities),
      )
      if (!userActivities.some((o) => o.id === id)) save([item, ...userActivities])
    },
    [archiveStore, persistArchive, save, userActivities],
  )

  const restoreActivities = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreActivity(id)
    },
    [restoreActivity],
  )

  const permanentlyDeleteActivity = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      if (useApi) {
        await permanentlyDeleteActivityApi(id)
      } else {
        purgeActivityLocalData(id)
      }
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteActivities = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (nextStore[id]) {
          delete nextStore[id]
          if (useApi) {
            await permanentlyDeleteActivityApi(id)
          } else {
            purgeActivityLocalData(id)
          }
        }
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
      saveArchivedActivityStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeActivityLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allActivities = useMemo(
    () =>
      userActivities.filter(
        (o) => !archivedIds.has(o.id),
      ),
    [userActivities, archivedIds],
  )

  const archivedActivities = useMemo(
    () => entriesFromStore(archiveStore, userActivities),
    [archiveStore, userActivities],
  )

  const value = useMemo(
    () => ({
      userActivities,
      allActivities,
      registryHydrated,
      archivedActivities,
      findById,
      addActivity,
      addActivities,
      updateActivityFromDetail,
      updateActivityStatus,
      archiveActivity,
      archiveActivities,
      restoreActivity,
      restoreActivities,
      permanentlyDeleteActivity,
      permanentlyDeleteActivities,
      isArchived,
      reloadFromApi,
    }),
    [
      userActivities,
      allActivities,
      registryHydrated,
      archivedActivities,
      findById,
      addActivity,
      addActivities,
      updateActivityFromDetail,
      updateActivityStatus,
      archiveActivity,
      archiveActivities,
      restoreActivity,
      restoreActivities,
      permanentlyDeleteActivity,
      permanentlyDeleteActivities,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <ActivitiesRegistryContext.Provider value={value}>
      {children}
    </ActivitiesRegistryContext.Provider>
  )
}
