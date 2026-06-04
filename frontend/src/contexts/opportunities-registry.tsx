import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveOpportunityApi,
  createOpportunityApi,
  deleteOpportunityApi,
  listOpportunitiesApi,
  opportunityDetailToApiBody,
  opportunityFormToApiBody,
  restoreOpportunityApi,
  updateOpportunityApi,
} from '@/api/opportunities'
import {
  OpportunitiesRegistryContext,
  type ArchivedOpportunityEntry,
} from '@/contexts/opportunities-registry-context'
import { resolveOpportunityListItem } from '@/data/opportunity-detail.mock'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { syncRegistryOpportunities } from '@/data/opportunities-registry-store'
import {
  formValuesToListItem,
  type CreateOpportunityFormValues,
} from '@/lib/opportunity-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromDetail } from '@/lib/opportunity-form'
import {
  type ArchivedOpportunityStore,
  archivedOpportunityIds,
  purgeExpiredFromStore,
} from '@/lib/opportunity-archive'
import { purgeOpportunityLocalData } from '@/lib/opportunity-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()

function snapshotForArchive(
  id: string,
  userOpportunities: OpportunityListItem[],
): OpportunityListItem {
  const fromUser = userOpportunities.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolveOpportunityListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedOpportunityStore,
  userOpportunities: OpportunityListItem[],
): ArchivedOpportunityEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      opportunity: record.snapshot ?? snapshotForArchive(record.id, userOpportunities),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function OpportunitiesRegistryProvider({ children }: { children: ReactNode }) {
  const [userOpportunities, setUserOpportunities] = useState<OpportunityListItem[]>([])

  const [archiveStore, setArchiveStore] = useState<ArchivedOpportunityStore>({})

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listOpportunitiesApi(false),
      listOpportunitiesApi(true),
    ])
    syncRegistryOpportunities(active)
    setUserOpportunities(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'oportunidades', enabled: false })

  const archivedIds = useMemo(() => archivedOpportunityIds(archiveStore), [archiveStore])

  const save = useCallback((next: OpportunityListItem[]) => {
    syncRegistryOpportunities(next)
    setUserOpportunities(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedOpportunityStore) => {
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userOpportunities.find((o) => o.id === id),
    [userOpportunities],
  )

  const addOpportunity = useCallback(
    async (values: CreateOpportunityFormValues) => {
      if (useApi) {
        const item = await createOpportunityApi(opportunityFormToApiBody(values))
        save([item, ...userOpportunities])
        return item
      }
      const item = formValuesToListItem(values)
      save([item, ...userOpportunities])
      return item
    },
    [save, userOpportunities],
  )

  const addOpportunities = useCallback(
    async (
      valuesList: CreateOpportunityFormValues[],
    ): Promise<OpportunityListItem[]> => {
      if (useApi) {
        const items = await Promise.all(
          valuesList.map((v) => createOpportunityApi(opportunityFormToApiBody(v))),
        )
        save([...items, ...userOpportunities])
        return items
      }
      const items = valuesList.map((v) => formValuesToListItem(v))
      save([...items, ...userOpportunities])
      return items
    },
    [save, userOpportunities],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateOpportunityFromDetail = useCallback(
    async (detail: OpportunityDetail) => {
      if (useApi) {
        const updated = await updateOpportunityApi(
          detail.id,
          opportunityDetailToApiBody(detail),
        )
        save(
          userOpportunities.map((o) =>
            o.id === detail.id ? { ...listItemFromDetail(updated), ...updated } : o,
          ),
        )
        return
      }
      const list = listItemFromDetail(detail)
      if (userOpportunities.some((o) => o.id === detail.id)) {
        save(userOpportunities.map((o) => (o.id === detail.id ? list : o)))
      }
    },
    [save, userOpportunities],
  )

  const archiveOpportunity = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveOpportunityApi(id)
        const next: ArchivedOpportunityStore = {
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        }
        persistArchive(next)
        save(userOpportunities.filter((o) => o.id !== id))
        return
      }
      const snapshot = snapshotForArchive(id, userOpportunities)
      const next: ArchivedOpportunityStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot },
      }
      persistArchive(next)
      const nextUser = userOpportunities.filter((o) => o.id !== id)
      if (nextUser.length !== userOpportunities.length) save(nextUser)
    },
    [archiveStore, archivedIds, persistArchive, save, userOpportunities],
  )

  const archiveOpportunities = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return

      if (useApi) {
        const now = Date.now()
        const next: ArchivedOpportunityStore = { ...archiveStore }
        for (const id of unique) {
          if (next[id] || archivedIds.has(id)) continue
          const snapshot = await archiveOpportunityApi(id)
          next[id] = { id, archivedAt: now, snapshot }
        }
        persistArchive(next)
        const idSet = new Set(unique)
        save(userOpportunities.filter((o) => !idSet.has(o.id)))
        return
      }

      const now = Date.now()
      const next: ArchivedOpportunityStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userOpportunities),
        }
      }
      persistArchive(next)
      const idSet = new Set(unique)
      const nextUser = userOpportunities.filter((o) => !idSet.has(o.id))
      if (nextUser.length !== userOpportunities.length) save(nextUser)
    },
    [archiveStore, archivedIds, persistArchive, save, userOpportunities],
  )

  const restoreOpportunity = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record) return
      if (useApi) {
        const item = await restoreOpportunityApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userOpportunities.some((o) => o.id === id)) save([item, ...userOpportunities])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record.snapshot ?? snapshotForArchive(id, userOpportunities))
      if (!userOpportunities.some((o) => o.id === id)) save([item, ...userOpportunities])
    },
    [archiveStore, persistArchive, save, userOpportunities],
  )

  const restoreOpportunities = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return

      if (useApi) {
        const nextStore = { ...archiveStore }
        const toRestore: OpportunityListItem[] = []
        for (const id of unique) {
          if (!nextStore[id]) continue
          const item = await restoreOpportunityApi(id)
          delete nextStore[id]
          if (
            !userOpportunities.some((o) => o.id === id) &&
            !toRestore.some((o) => o.id === id)
          ) {
            toRestore.push(item)
          }
        }
        persistArchive(nextStore)
        if (toRestore.length > 0) save([...toRestore, ...userOpportunities])
        return
      }

      const nextStore = { ...archiveStore }
      const toRestore: OpportunityListItem[] = []
      for (const id of unique) {
        const record = nextStore[id]
        if (!record) continue
        delete nextStore[id]
        const item = stampRecordAuditOnUpdate(
          record.snapshot ?? snapshotForArchive(id, userOpportunities),
        )
        if (
          !userOpportunities.some((o) => o.id === id) &&
          !toRestore.some((o) => o.id === id)
        ) {
          toRestore.push(item)
        }
      }
      persistArchive(nextStore)
      if (toRestore.length > 0) save([...toRestore, ...userOpportunities])
    },
    [archiveStore, persistArchive, save, userOpportunities],
  )

  const permanentlyDeleteOpportunity = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await deleteOpportunityApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      save(userOpportunities.filter((o) => o.id !== id))
      purgeOpportunityLocalData(id)
    },
    [archiveStore, persistArchive, save, userOpportunities],
  )

  const permanentlyDeleteOpportunities = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        await Promise.all(unique.map((id) => deleteOpportunityApi(id)))
      }
      const nextStore = { ...archiveStore }
      const idSet = new Set(unique)
      for (const id of unique) {
        if (nextStore[id]) {
          delete nextStore[id]
          purgeOpportunityLocalData(id)
        }
      }
      persistArchive(nextStore)
      save(userOpportunities.filter((o) => !idSet.has(o.id)))
    },
    [archiveStore, persistArchive, save, userOpportunities],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeOpportunityLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allOpportunities = useMemo(
    () =>
      userOpportunities.filter(
        (o) => !archivedIds.has(o.id),
      ),
    [userOpportunities, archivedIds],
  )

  const archivedOpportunities = useMemo(
    () => entriesFromStore(archiveStore, userOpportunities),
    [archiveStore, userOpportunities],
  )

  const value = useMemo(
    () => ({
      userOpportunities,
      allOpportunities,
      archivedOpportunities,
      findById,
      addOpportunity,
      addOpportunities,
      updateOpportunityFromDetail,
      archiveOpportunity,
      archiveOpportunities,
      restoreOpportunity,
      restoreOpportunities,
      permanentlyDeleteOpportunity,
      permanentlyDeleteOpportunities,
      isArchived,
      reloadFromApi,
    }),
    [
      userOpportunities,
      allOpportunities,
      archivedOpportunities,
      findById,
      addOpportunity,
      addOpportunities,
      updateOpportunityFromDetail,
      archiveOpportunity,
      archiveOpportunities,
      restoreOpportunity,
      restoreOpportunities,
      permanentlyDeleteOpportunity,
      permanentlyDeleteOpportunities,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <OpportunitiesRegistryContext.Provider value={value}>
      {children}
    </OpportunitiesRegistryContext.Provider>
  )
}
