import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveProjectApi,
  createProjectApi,
  permanentlyDeleteProjectApi,
  projectDetailToApiBody,
  projectFormToApiBody,
  projectPatchToApiBody,
  listProjectsApi,
  restoreProjectApi,
  updateProjectApi,
} from '@/api/projects'
import {
  ProjectsRegistryContext,
  type ArchivedProjectEntry,
} from '@/contexts/projects-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { resolveProjectListItem } from '@/data/project-detail.mock'
import type { ProjectDetail } from '@/data/project-detail.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import { syncRegistryProjects } from '@/data/projects-registry-store'
import {
  formValuesToListItem,
  type CreateProjectFormValues,
} from '@/lib/project-create'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import { listItemFromProjectDetail } from '@/lib/project-form'
import { journeyToListStatus, legacyStatusToJourney } from '@/lib/project-journey'
import {
  type ArchivedProjectStore,
  archivedProjectIds,
  loadArchivedProjectStore,
  purgeExpiredFromStore,
  saveArchivedProjectStore,
} from '@/lib/project-archive'
import { purgeProjectLocalData } from '@/lib/project-permanent-delete'
import { archivedStoreFromList } from '@/lib/registry-archive-from-api'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-projects`

function loadStored(): ProjectListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProjectListItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((p) => {
      if (p.journeyStage) return p
      const journeyStage = legacyStatusToJourney(p.status, p.progressNum)
      return { ...p, journeyStage, status: journeyToListStatus(journeyStage) }
    })
  } catch {
    return []
  }
}

function persistLocal(projects: ProjectListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    /* ignore */
  }
}

function snapshotForArchive(
  id: string,
  userProjects: ProjectListItem[],
): ProjectListItem {
  const fromUser = userProjects.find((o) => o.id === id)
  const base = fromUser ? { ...fromUser } : resolveProjectListItem(id)
  return stampRecordAuditOnUpdate(base)
}

function entriesFromStore(
  store: ArchivedProjectStore,
  userProjects: ProjectListItem[],
): ArchivedProjectEntry[] {
  return Object.values(store)
    .map((record) => ({
      ...record,
      project: record.snapshot ?? snapshotForArchive(record.id, userProjects),
    }))
    .sort((a, b) => b.archivedAt - a.archivedAt)
}

export function ProjectsRegistryProvider({ children }: { children: ReactNode }) {
  const [userProjects, setUserProjects] = useState<ProjectListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStored()
    syncRegistryProjects(loaded)
    return loaded
  })

  const [archiveStore, setArchiveStore] = useState<ArchivedProjectStore>(() => {
    if (useApi) return {}
    const loaded = loadArchivedProjectStore()
    const { store } = purgeExpiredFromStore(loaded)
    if (Object.keys(store).length !== Object.keys(loaded).length) {
      saveArchivedProjectStore(store)
    }
    return store
  })

  const reloadFromApi = useCallback(async () => {
    const [active, archived] = await Promise.all([
      listProjectsApi(false),
      listProjectsApi(true),
    ])
    syncRegistryProjects(active)
    setUserProjects(active)
    setArchiveStore(archivedStoreFromList(archived))
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const archivedIds = useMemo(() => archivedProjectIds(archiveStore), [archiveStore])

  const save = useCallback(
    (next: ProjectListItem[]) => {
      syncRegistryProjects(next)
      setUserProjects(next)
      if (!useApi) persistLocal(next)
    },
    [],
  )

  const persistArchive = useCallback((store: ArchivedProjectStore) => {
    if (!useApi) saveArchivedProjectStore(store)
    setArchiveStore(store)
  }, [])

  const findById = useCallback(
    (id: string) => userProjects.find((o) => o.id === id),
    [userProjects],
  )

  const addProject = useCallback(
    async (values: CreateProjectFormValues) => {
      if (useApi) {
        const detail = await createProjectApi(projectFormToApiBody(values))
        const item = listItemFromProjectDetail(detail as ProjectDetail)
        save([item, ...userProjects])
        return item
      }
      const item = formValuesToListItem(values)
      save([item, ...userProjects])
      return item
    },
    [save, userProjects],
  )

  const addProjects = useCallback(
    async (valuesList: CreateProjectFormValues[]) => {
      if (useApi) {
        const items: ProjectListItem[] = []
        for (const values of valuesList) {
          const detail = await createProjectApi(projectFormToApiBody(values))
          items.push(listItemFromProjectDetail(detail as ProjectDetail))
        }
        save([...items, ...userProjects])
        return items
      }
      const items = valuesList.map((v) => formValuesToListItem(v))
      save([...items, ...userProjects])
      return items
    },
    [save, userProjects],
  )

  const isArchived = useCallback(
    (id: string) => archivedIds.has(id),
    [archivedIds],
  )

  const updateProjectFromDetail = useCallback(
    async (detail: ProjectDetail): Promise<ProjectDetail> => {
      const list = listItemFromProjectDetail(detail)
      if (useApi) {
        const saved = await updateProjectApi(detail.id, projectDetailToApiBody(detail))
        if (userProjects.some((p) => p.id === detail.id)) {
          save(userProjects.map((p) => (p.id === detail.id ? list : p)))
        }
        return saved as ProjectDetail
      }
      if (userProjects.some((p) => p.id === detail.id)) {
        save(userProjects.map((p) => (p.id === detail.id ? list : p)))
      }
      return detail
    },
    [save, userProjects],
  )

  const updateProject = useCallback(
    async (id: string, patch: Partial<ProjectListItem>) => {
      if (useApi) {
        await updateProjectApi(id, projectPatchToApiBody(patch))
        const idx = userProjects.findIndex((p) => p.id === id)
        if (idx >= 0) {
          save(
            userProjects.map((p) =>
              p.id === id ? stampRecordAuditOnUpdate({ ...p, ...patch }) : p,
            ),
          )
        }
        return
      }
      const idx = userProjects.findIndex((p) => p.id === id)
      if (idx < 0) return
      save(userProjects.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    },
    [save, userProjects],
  )

  const archiveProject = useCallback(
    async (id: string) => {
      if (archivedIds.has(id)) return
      if (useApi) {
        const snapshot = await archiveProjectApi(id)
        persistArchive({
          ...archiveStore,
          [id]: { id, archivedAt: Date.now(), snapshot },
        })
        save(userProjects.filter((o) => o.id !== id))
        return
      }
      const next: ArchivedProjectStore = {
        ...archiveStore,
        [id]: { id, archivedAt: Date.now(), snapshot: snapshotForArchive(id, userProjects) },
      }
      persistArchive(next)
      save(userProjects.filter((o) => o.id !== id))
    },
    [archiveStore, archivedIds, persistArchive, save, userProjects],
  )

  const archiveProjects = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      if (useApi) {
        for (const id of unique) {
          if (!archivedIds.has(id)) await archiveProject(id)
        }
        return
      }
      const now = Date.now()
      const next: ArchivedProjectStore = { ...archiveStore }
      for (const id of unique) {
        if (next[id]) continue
        next[id] = {
          id,
          archivedAt: now,
          snapshot: snapshotForArchive(id, userProjects),
        }
      }
      persistArchive(next)
      save(userProjects.filter((o) => !unique.includes(o.id)))
    },
    [archiveProject, archiveStore, archivedIds, persistArchive, save, userProjects],
  )

  const restoreProject = useCallback(
    async (id: string) => {
      const record = archiveStore[id]
      if (!record && !useApi) return
      if (useApi) {
        const item = await restoreProjectApi(id)
        const next = { ...archiveStore }
        delete next[id]
        persistArchive(next)
        if (!userProjects.some((o) => o.id === id)) save([item, ...userProjects])
        return
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      const item = stampRecordAuditOnUpdate(
        record!.snapshot ?? snapshotForArchive(id, userProjects),
      )
      if (!userProjects.some((o) => o.id === id)) save([item, ...userProjects])
    },
    [archiveStore, persistArchive, save, userProjects],
  )

  const restoreProjects = useCallback(
    async (ids: string[]) => {
      for (const id of ids) await restoreProject(id)
    },
    [restoreProject],
  )

  const permanentlyDeleteProject = useCallback(
    async (id: string) => {
      if (!archiveStore[id]) return
      if (useApi) {
        await permanentlyDeleteProjectApi(id)
      }
      const next = { ...archiveStore }
      delete next[id]
      persistArchive(next)
      purgeProjectLocalData(id)
    },
    [archiveStore, persistArchive],
  )

  const permanentlyDeleteProjects = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      const nextStore = { ...archiveStore }
      for (const id of unique) {
        if (!nextStore[id]) continue
        if (useApi) {
          await permanentlyDeleteProjectApi(id)
        }
        delete nextStore[id]
        purgeProjectLocalData(id)
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
      saveArchivedProjectStore(store)
      setArchiveStore(store)
      purgedIds.forEach((id) => purgeProjectLocalData(id))
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [archiveStore])

  const allProjects = useMemo(
    () =>
      userProjects.filter(
        (o) => !archivedIds.has(o.id),
      ),
    [userProjects, archivedIds],
  )

  const archivedProjects = useMemo(
    () => entriesFromStore(archiveStore, userProjects),
    [archiveStore, userProjects],
  )

  const value = useMemo(
    () => ({
      userProjects,
      allProjects,
      archivedProjects,
      findById,
      addProject,
      addProjects,
      updateProjectFromDetail,
      updateProject,
      archiveProject,
      archiveProjects,
      restoreProject,
      restoreProjects,
      permanentlyDeleteProject,
      permanentlyDeleteProjects,
      isArchived,
      reloadFromApi,
    }),
    [
      userProjects,
      allProjects,
      archivedProjects,
      findById,
      addProject,
      addProjects,
      updateProjectFromDetail,
      updateProject,
      archiveProject,
      archiveProjects,
      restoreProject,
      restoreProjects,
      permanentlyDeleteProject,
      permanentlyDeleteProjects,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <ProjectsRegistryContext.Provider value={value}>
      {children}
    </ProjectsRegistryContext.Provider>
  )
}
