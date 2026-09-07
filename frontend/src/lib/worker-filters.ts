import type {
  WorkerContractType,
  WorkerListItem,
  WorkerStatus,
} from '@/data/workers.mock'
import {
  WORKER_CONTRACT_TYPE_OPTIONS,
  WORKER_STATUS_OPTIONS,
} from '@/data/workers.mock'

export { WORKER_STATUS_OPTIONS, WORKER_CONTRACT_TYPE_OPTIONS }

export type WorkerFilters = {
  statuses: WorkerStatus[]
  contractTypes: WorkerContractType[]
  businessUnit: string
}

export function createDefaultWorkerFilters(): WorkerFilters {
  return { statuses: [], contractTypes: [], businessUnit: '' }
}

export function countActiveWorkerFilters(filters: WorkerFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.contractTypes.length > 0) n += 1
  if (filters.businessUnit.trim()) n += 1
  return n
}

export function workerRowMatchesFilters(
  row: WorkerListItem,
  filters: WorkerFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status as WorkerStatus)) {
    return false
  }
  if (
    filters.contractTypes.length > 0 &&
    !filters.contractTypes.includes(row.contractType as WorkerContractType)
  ) {
    return false
  }
  if (
    filters.businessUnit.trim() &&
    !row.businessUnit.toLowerCase().includes(filters.businessUnit.trim().toLowerCase())
  ) {
    return false
  }
  return true
}

export function workerFiltersToServerQuery(
  filters: WorkerFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {}
  if (filters.statuses.length > 0) query.status = filters.statuses.join(',')
  if (filters.contractTypes.length > 0) query.contractType = filters.contractTypes.join(',')
  if (filters.businessUnit.trim()) query.businessUnit = filters.businessUnit.trim()
  if (options?.mine && options.ownerName?.trim()) query.ownerName = options.ownerName.trim()
  return query
}
