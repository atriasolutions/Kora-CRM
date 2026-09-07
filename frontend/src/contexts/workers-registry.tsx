import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  archiveWorkerApi,
  createWorkerApi,
  listWorkersApi,
  permanentlyDeleteWorkerApi,
  restoreWorkerApi,
  updateWorkerApi,
} from '@/api/workers'
import { WorkersRegistryContext } from '@/contexts/workers-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import type { WorkerDetail, WorkerListItem } from '@/data/workers.mock'
import { syncRegistryWorkers } from '@/data/workers-registry-store'
import {
  formValuesToWorkerListItem,
  listItemFromWorkerDetail,
  workerFormToApiBody,
  type WorkerFormValues,
} from '@/lib/worker-form'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-workers`

function loadStored(): WorkerListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WorkerListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistLocal(workers: WorkerListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workers))
  } catch {
    /* ignore */
  }
}

export function WorkersRegistryProvider({ children }: { children: ReactNode }) {
  const [workers, setWorkers] = useState<WorkerListItem[]>(() => {
    if (useApi) return []
    const loaded = loadStored()
    syncRegistryWorkers(loaded)
    return loaded
  })
  const [archived, setArchived] = useState<WorkerListItem[]>([])

  const reloadFromApi = useCallback(async () => {
    const [active, archivedList] = await Promise.all([
      listWorkersApi(false),
      listWorkersApi(true),
    ])
    syncRegistryWorkers(active)
    setWorkers(active)
    setArchived(archivedList)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'trabajadores' })

  const save = useCallback((next: WorkerListItem[]) => {
    syncRegistryWorkers(next)
    setWorkers(next)
    if (!useApi) persistLocal(next)
  }, [])

  const findById = useCallback(
    (id: string) => workers.find((w) => w.id === id),
    [workers],
  )

  const isArchived = useCallback(
    (id: string) => archived.some((w) => w.id === id),
    [archived],
  )

  const addWorker = useCallback(
    async (values: WorkerFormValues) => {
      if (useApi) {
        const detail = await createWorkerApi(workerFormToApiBody(values))
        const item = listItemFromWorkerDetail(detail)
        save([item, ...workers])
        return item
      }
      const item = formValuesToWorkerListItem(values)
      save([item, ...workers])
      return item
    },
    [save, workers],
  )

  const updateWorkerFromDetail = useCallback(
    async (detail: WorkerDetail) => {
      const item = listItemFromWorkerDetail(detail)
      if (useApi) {
        await updateWorkerApi(detail.id, workerFormToApiBody({
          number: detail.number,
          fullName: detail.fullName,
          taxId: detail.taxId,
          email: detail.email,
          phone: detail.phone,
          address: detail.address,
          avatarUrl: detail.avatarUrl,
          jobTitle: detail.jobTitle,
          businessUnit: detail.businessUnit,
          jobFunctions: detail.jobFunctions,
          status: detail.status,
          contractType: detail.contractType,
          workHours: String(detail.workHours),
          startDate: detail.startDate,
          endDate: detail.endDate,
          baseSalary: detail.baseSalary,
          gratification: detail.gratification,
          afpName: detail.afpName,
          afpRate: String(detail.afpRate),
          healthInstitution: detail.healthInstitution,
          healthPlan: detail.healthPlan,
          afcRate: String(detail.afcRate),
          vacationAdjustmentDays: String(detail.vacationAdjustmentDays),
          paydayDay: String(detail.paydayDay),
          ownerName: detail.owner,
        }))
      }
      if (workers.some((w) => w.id === detail.id)) {
        save(workers.map((w) => (w.id === detail.id ? item : w)))
      }
    },
    [save, workers],
  )

  const archiveWorker = useCallback(
    async (id: string) => {
      if (isArchived(id)) return
      if (useApi) {
        const snapshot = await archiveWorkerApi(id)
        setArchived((prev) => [snapshot, ...prev])
        save(workers.filter((w) => w.id !== id))
        return
      }
      const current = workers.find((w) => w.id === id)
      if (current) setArchived((prev) => [current, ...prev])
      save(workers.filter((w) => w.id !== id))
    },
    [isArchived, save, workers],
  )

  const archiveWorkers = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
      for (const id of unique) {
        if (!isArchived(id)) await archiveWorker(id)
      }
    },
    [archiveWorker, isArchived],
  )

  const restoreWorker = useCallback(
    async (id: string) => {
      if (useApi) {
        const item = await restoreWorkerApi(id)
        setArchived((prev) => prev.filter((w) => w.id !== id))
        if (!workers.some((w) => w.id === id)) save([item, ...workers])
        return
      }
      const record = archived.find((w) => w.id === id)
      setArchived((prev) => prev.filter((w) => w.id !== id))
      if (record && !workers.some((w) => w.id === id)) save([record, ...workers])
    },
    [archived, save, workers],
  )

  const permanentlyDeleteWorker = useCallback(
    async (id: string) => {
      if (useApi) await permanentlyDeleteWorkerApi(id)
      setArchived((prev) => prev.filter((w) => w.id !== id))
      purgeEntityAttachments('trabajador', id, 'trabajador')
    },
    [],
  )

  const allWorkers = useMemo(
    () => workers.filter((w) => !archived.some((a) => a.id === w.id)),
    [workers, archived],
  )

  const value = useMemo(
    () => ({
      allWorkers,
      archivedWorkers: archived,
      findById,
      addWorker,
      updateWorkerFromDetail,
      archiveWorker,
      archiveWorkers,
      restoreWorker,
      permanentlyDeleteWorker,
      isArchived,
      reloadFromApi,
    }),
    [
      allWorkers,
      archived,
      findById,
      addWorker,
      updateWorkerFromDetail,
      archiveWorker,
      archiveWorkers,
      restoreWorker,
      permanentlyDeleteWorker,
      isArchived,
      reloadFromApi,
    ],
  )

  return (
    <WorkersRegistryContext.Provider value={value}>
      {children}
    </WorkersRegistryContext.Provider>
  )
}
