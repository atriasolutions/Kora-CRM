import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type PruebaSolicitudFilters = {
  solicitudId: string
  solicitudCode: string
  solicitudTitle: string
  companyId: string
  companyName: string
  date: ListDateFilter
}

export function createDefaultPruebaSolicitudFilters(): PruebaSolicitudFilters {
  return {
    solicitudId: '',
    solicitudCode: '',
    solicitudTitle: '',
    companyId: '',
    companyName: '',
    date: createDefaultListDateFilter(),
  }
}

export function countActivePruebaSolicitudFilters(filters: PruebaSolicitudFilters): number {
  let n = 0
  if (filters.solicitudId.trim()) n += 1
  if (filters.companyId.trim()) n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function pruebaSolicitudRowMatchesFilters(
  row: PruebaSolicitudListItem,
  filters: PruebaSolicitudFilters,
): boolean {
  if (filters.solicitudId.trim() && row.solicitudId !== filters.solicitudId.trim()) {
    return false
  }
  if (filters.companyId.trim()) {
    if (row.companyId) {
      if (row.companyId !== filters.companyId.trim()) return false
    } else if (
      row.companyName?.trim().toLowerCase() !== filters.companyName.trim().toLowerCase()
    ) {
      return false
    }
  }
  if (!listRowMatchesDateFilter(row.updatedAt || row.createdAt || '', filters.date)) {
    return false
  }
  return true
}

export type PruebaSolicitudServerListQuery = Record<string, string>

export function pruebaSolicitudFiltersToServerQuery(
  filters: PruebaSolicitudFilters,
): PruebaSolicitudServerListQuery {
  const query: PruebaSolicitudServerListQuery = {
    ...listDateFilterToServerQuery(filters.date),
  }
  const solicitudId = filters.solicitudId.trim()
  const companyId = filters.companyId.trim()
  if (solicitudId) query.solicitudId = solicitudId
  if (companyId) query.companyId = companyId
  return query
}

export function pruebaSolicitudFiltersResetKey(filters: PruebaSolicitudFilters): string {
  return JSON.stringify(pruebaSolicitudFiltersToServerQuery(filters))
}
