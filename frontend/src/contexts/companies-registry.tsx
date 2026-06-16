import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  archiveCompanyApi,
  companyDetailToApiBody,
  companyDetailToLocationsPayload,
  companyFormToApiBody,
  companyFormValuesToLocationsPayload,
  createCompanyApi,
  deleteCompanyApi,
  listCompaniesApi,
  putCompanyLocationsApi,
  restoreCompanyApi,
  updateCompanyApi,
} from '@/api/companies'
import { isApiEnabled } from '@/api/config'
import {
  CompaniesRegistryContext,
  type ArchivedCompanyEntry,
} from '@/contexts/companies-registry-context'
import { resolveCompanyListItem } from '@/data/company-detail.mock'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import { syncRegistryCompanies } from '@/data/companies-registry-store'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromCompanyDetail, companyDetailToOverride, companyFormValuesToDetail } from '@/lib/company-form'
import type { CreateCompanyFormValues } from '@/lib/company-create'
import {
  type ArchivedCompanyStore,
  archivedCompanyIds,
  purgeExpiredFromStore,
} from '@/lib/company-archive'
import { persistCompanyDetailOverride } from '@/lib/company-detail-storage'
import { purgeCompanyLocalData } from '@/lib/company-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import {
  cacheEntityListImage,
  mergeListImagesIntoCompanies,
} from '@/lib/entity-list-image-cache'
const useApi = isApiEnabled()

function snapshotForArchive(
  id: string,
  userCompanies: CompanyListItem[],
): CompanyListItem {
  const fromUser = userCompanies.find((c) => c.id === id)
  const base = fromUser ? { ...fromUser } : resolveCompanyListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedCompanyStore,
  userCompanies: CompanyListItem[],
): ArchivedCompanyEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      company: record.snapshot ?? snapshotForArchive(record.id, userCompanies),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function CompaniesRegistryProvider({ children }: { children: ReactNode }) {
  const [userCompanies, setUserCompanies] = useState<CompanyListItem[]>([])

  const [archiveStore, setArchiveStore] = useState<ArchivedCompanyStore>({})

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listCompaniesApi(false),
      listCompaniesApi(true),
    ])
    syncRegistryCompanies(active)
    setUserCompanies(mergeListImagesIntoCompanies(active))
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedCompanyIds(archiveStore), [archiveStore])

  const save = useCallback((next: CompanyListItem[]) => {
    syncRegistryCompanies(next)
    setUserCompanies(next)
  }, [])

  const persistArchive = useCallback((store: ArchivedCompanyStore) => {
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userCompanies.find((c) => c.id === id),
    [userCompanies],
  )

  const addCompany = useCallback(
    async (values: CreateCompanyFormValues) => {
      if (useApi) {
        const item = await createCompanyApi(companyFormToApiBody(values))
        await putCompanyLocationsApi(
          item.id,
          companyFormValuesToLocationsPayload(values, item.id),
        )
        const detail = companyFormValuesToDetail(values, item.id)
        persistCompanyDetailOverride(item.id, companyDetailToOverride(detail))
        cacheEntityListImage('company', item.id, detail.logoUrl)
        const list = listItemFromCompanyDetail(detail)
        save([list, ...userCompanies])
        return list
      }
      const detail = companyFormValuesToDetail(values)
      persistCompanyDetailOverride(detail.id, companyDetailToOverride(detail))
      cacheEntityListImage('company', detail.id, detail.logoUrl)
      const item = listItemFromCompanyDetail(detail)
      save([item, ...userCompanies])
      return item
    },
    [save, userCompanies],
  )

  const addCompanies = useCallback(
    async (valuesList: CreateCompanyFormValues[]): Promise<CompanyListItem[]> => {
      if (useApi) {
        const items = await Promise.all(
          valuesList.map(async (v) => {
            const item = await createCompanyApi(companyFormToApiBody(v))
            await putCompanyLocationsApi(
              item.id,
              companyFormValuesToLocationsPayload(v, item.id),
            )
            const detail = companyFormValuesToDetail(v, item.id)
            persistCompanyDetailOverride(item.id, companyDetailToOverride(detail))
            cacheEntityListImage('company', item.id, detail.logoUrl)
            return listItemFromCompanyDetail(detail)
          }),
        )
        save([...items, ...userCompanies])
        return items
      }
      const items = valuesList.map((v) => {
        const detail = companyFormValuesToDetail(v)
        persistCompanyDetailOverride(detail.id, companyDetailToOverride(detail))
        return listItemFromCompanyDetail(detail)
      })
      save([...items, ...userCompanies])
      return items
    },
    [save, userCompanies],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateCompanyFromDetail = useCallback(
    async (detail: CompanyDetail): Promise<CompanyDetail> => {
      if (useApi) {
        const saved = await updateCompanyApi(detail.id, companyDetailToApiBody(detail))
        await putCompanyLocationsApi(detail.id, companyDetailToLocationsPayload(detail))
        const merged: CompanyDetail = {
          ...detail,
          logoUrl: saved.logoUrl?.trim() || detail.logoUrl,
          name: saved.name,
          website: saved.website?.trim() ?? detail.website,
          phone: saved.phone?.trim() ?? detail.phone,
          email: saved.email?.trim() ?? detail.email,
          description: saved.description?.trim() ?? detail.description,
        }
        cacheEntityListImage('company', detail.id, merged.logoUrl)
        const list = listItemFromCompanyDetail(merged)
        save(userCompanies.map((c) => (c.id === detail.id ? list : c)))
        return merged
      }
      const list = listItemFromCompanyDetail(detail)
      cacheEntityListImage('company', detail.id, list.logoUrl)
      persistCompanyDetailOverride(detail.id, {
        branches: detail.branches,
        addresses: detail.addresses,
        headquarters: detail.headquarters,
        website: detail.website,
        phone: detail.phone,
        email: detail.email,
        description: detail.description,
        tags: detail.tags,
        ownerDetail: detail.ownerDetail,
      })
      if (userCompanies.some((c) => c.id === detail.id)) {
        save(userCompanies.map((c) => (c.id === detail.id ? list : c)))
      }
      return detail
    },
    [save, userCompanies],
  )

  const archiveCompany = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveCompanyApi(id)
        const next: ArchivedCompanyStore = {
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        }
        persistArchive(next)
        save(userCompanies.filter((c) => c.id !== id))
        return
      }
      const snapshot = snapshotForArchive(id, userCompanies)
      const next: ArchivedCompanyStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot },
      }
      persistArchive(next)

      const nextUser = userCompanies.filter((c) => c.id !== id)
      if (nextUser.length !== userCompanies.length) {
        save(nextUser)
      }
    },
    [archiveStore, archivedIds, persistArchive, save, userCompanies],
  )

  const archiveCompanies = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return

      if (useApi) {
        const now = Date.now()
        const next: ArchivedCompanyStore = { ...archiveStore }
        for (const id of unique) {
          if (next[id] || archivedIds.has(id)) continue
          const snapshot = await archiveCompanyApi(id)
          next[id] = { id, archivedAt: now, snapshot }
        }
        persistArchive(next)
        const idSet = new Set(unique)
        save(userCompanies.filter((c) => !idSet.has(c.id)))
        return
      }

      const now = Date.now()
      const next: ArchivedCompanyStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userCompanies),
        }
      }
      persistArchive(next)

      const idSet = new Set(unique)
      const nextUser = userCompanies.filter((c) => !idSet.has(c.id))
      if (nextUser.length !== userCompanies.length) {
        save(nextUser)
      }
    },
    [archiveStore, archivedIds, persistArchive, save, userCompanies],
  )

  const restoreCompany = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record) return

      if (useApi) {
        const item = await restoreCompanyApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userCompanies.some((c) => c.id === id)) {
          save([item, ...userCompanies])
        }
        return
      }

      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)

      const item = stampRecordAuditOnUpdate(
        record.snapshot ?? snapshotForArchive(id, userCompanies))
      if (!userCompanies.some((c) => c.id === id)) {
        save([item, ...userCompanies])
      }
    },
    [archiveStore, persistArchive, save, userCompanies],
  )

  const restoreCompanies = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return

      if (useApi) {
        const nextStore = { ...archiveStore }
        const toRestore: CompanyListItem[] = []
        for (const id of unique) {
          if (!nextStore[id]) continue
          const item = await restoreCompanyApi(id)
          delete nextStore[id]
          if (
            !userCompanies.some((c) => c.id === id) &&
            !toRestore.some((c) => c.id === id)
          ) {
            toRestore.push(item)
          }
        }
        persistArchive(nextStore)
        if (toRestore.length > 0) {
          save([...toRestore, ...userCompanies])
        }
        return
      }

      const nextStore = { ...archiveStore }
      const toRestore: CompanyListItem[] = []
      for (const id of unique) {
        const record = nextStore[id]
        if (!record) continue
        delete nextStore[id]
        const item = stampRecordAuditOnUpdate(
          record.snapshot ?? snapshotForArchive(id, userCompanies),
        )
        if (
          !userCompanies.some((c) => c.id === id) &&
          !toRestore.some((c) => c.id === id)
        ) {
          toRestore.push(item)
        }
      }
      persistArchive(nextStore)
      if (toRestore.length > 0) {
        save([...toRestore, ...userCompanies])
      }
    },
    [archiveStore, persistArchive, save, userCompanies],
  )

  const permanentlyDeleteCompany = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await deleteCompanyApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      save(userCompanies.filter((c) => c.id !== id))
      purgeCompanyLocalData(id)
    },
    [archiveStore, persistArchive, save, userCompanies],
  )

  const permanentlyDeleteCompanies = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        await Promise.all(unique.map((id) => deleteCompanyApi(id)))
      }
      const nextStore = { ...archiveStore }
      const idSet = new Set(unique)
      for (const id of unique) {
        if (nextStore[id]) {
          delete nextStore[id]
          purgeCompanyLocalData(id)
        }
      }
      persistArchive(nextStore)
      save(userCompanies.filter((c) => !idSet.has(c.id)))
    },
    [archiveStore, persistArchive, save, userCompanies],
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      const { store, purgedIds } = purgeExpiredFromStore(archiveStore)
      if (purgedIds.length === 0) return
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeCompanyLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allCompanies = useMemo(
    () =>
      mergeListImagesIntoCompanies(
        userCompanies.filter((c) => !archivedIds.has(c.id)),
      ),
    [userCompanies, archivedIds],
  )

  const archivedCompanies = useMemo(
    () => entriesFromStore(archiveStore, userCompanies),
    [archiveStore, userCompanies],
  )

  const value = useMemo(
    () => ({
      userCompanies,
      allCompanies,
      archivedCompanies,
      findById,
      addCompany,
      addCompanies,
      updateCompanyFromDetail,
      archiveCompany,
      archiveCompanies,
      restoreCompany,
      restoreCompanies,
      permanentlyDeleteCompany,
      permanentlyDeleteCompanies,
      isArchived,
      reloadFromApi,
    }),
    [
      userCompanies,
      allCompanies,
      archivedCompanies,
      findById,
      addCompany,
      addCompanies,
      updateCompanyFromDetail,
      archiveCompany,
      archiveCompanies,
      restoreCompany,
      restoreCompanies,
      permanentlyDeleteCompany,
      permanentlyDeleteCompanies,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <CompaniesRegistryContext.Provider value={value}>
      {children}
    </CompaniesRegistryContext.Provider>
  )
}
