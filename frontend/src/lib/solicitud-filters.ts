import type {
  SolicitudListItem,
  SolicitudPriority,
  SolicitudStatus,
} from '@/data/solicitudes.mock'
import {
  SOLICITUD_PRIORITY_OPTIONS,
  SOLICITUD_STATUS_OPTIONS,
} from '@/data/solicitudes.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type SolicitudFilters = {
  statuses: SolicitudStatus[]
  priorities: SolicitudPriority[]
  date: ListDateFilter
}

export { SOLICITUD_STATUS_OPTIONS, SOLICITUD_PRIORITY_OPTIONS }

export function createDefaultSolicitudFilters(): SolicitudFilters {
  return { statuses: [], priorities: [], date: createDefaultListDateFilter() }
}

export function countActiveSolicitudFilters(filters: SolicitudFilters): number {
  let n = 0
  if (
    filters.statuses.length > 0 &&
    filters.statuses.length < SOLICITUD_STATUS_OPTIONS.length
  ) {
    n += 1
  }
  if (
    filters.priorities.length > 0 &&
    filters.priorities.length < SOLICITUD_PRIORITY_OPTIONS.length
  ) {
    n += 1
  }
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function solicitudRowMatchesFilters(
  row: SolicitudListItem,
  filters: SolicitudFilters,
): boolean {
  // OR dentro de estado / prioridad; AND entre dimensiones.
  if (
    filters.statuses.length > 0 &&
    filters.statuses.length < SOLICITUD_STATUS_OPTIONS.length &&
    !filters.statuses.includes(row.status)
  ) {
    return false
  }
  if (
    filters.priorities.length > 0 &&
    filters.priorities.length < SOLICITUD_PRIORITY_OPTIONS.length &&
    !filters.priorities.includes(row.priority)
  ) {
    return false
  }
  if (!listRowMatchesDateFilter(row.createdAt, filters.date)) return false
  return true
}

export function solicitudFiltersToServerQuery(
  filters: SolicitudFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  // OR dentro de cada dimensión. Si están todas las opciones, no filtrar.
  if (
    filters.statuses.length > 0 &&
    filters.statuses.length < SOLICITUD_STATUS_OPTIONS.length
  ) {
    query.status = filters.statuses.join(',')
  }
  if (
    filters.priorities.length > 0 &&
    filters.priorities.length < SOLICITUD_PRIORITY_OPTIONS.length
  ) {
    query.priority = filters.priorities.join(',')
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}
