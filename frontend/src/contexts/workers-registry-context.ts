import { createContext } from 'react'

import type { WorkerDetail, WorkerListItem } from '@/data/workers.mock'
import type { WorkerFormValues } from '@/lib/worker-form'

export type WorkersRegistryContextValue = {
  allWorkers: WorkerListItem[]
  archivedWorkers: WorkerListItem[]
  findById: (id: string) => WorkerListItem | undefined
  addWorker: (values: WorkerFormValues) => Promise<WorkerListItem>
  updateWorkerFromDetail: (detail: WorkerDetail) => Promise<void>
  archiveWorker: (id: string) => Promise<void>
  archiveWorkers: (ids: string[]) => Promise<void>
  restoreWorker: (id: string) => Promise<void>
  permanentlyDeleteWorker: (id: string) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const WorkersRegistryContext = createContext<WorkersRegistryContextValue | null>(null)
