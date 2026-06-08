import type {
  SolicitudListItem,
  SolicitudPriority,
  SolicitudStatus,
} from '@/data/solicitudes.mock'
import {
  SOLICITUD_PRIORITY_OPTIONS,
  SOLICITUD_STATUS_OPTIONS,
} from '@/data/solicitudes.mock'

export type SolicitudFilters = {
  statuses: SolicitudStatus[]
  priorities: SolicitudPriority[]
}

export { SOLICITUD_STATUS_OPTIONS, SOLICITUD_PRIORITY_OPTIONS }

export function createDefaultSolicitudFilters(): SolicitudFilters {
  return { statuses: [], priorities: [] }
}

export function countActiveSolicitudFilters(filters: SolicitudFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.priorities.length > 0) n += 1
  return n
}

export function solicitudRowMatchesFilters(
  row: SolicitudListItem,
  filters: SolicitudFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false
  if (filters.priorities.length > 0 && !filters.priorities.includes(row.priority)) {
    return false
  }
  return true
}
