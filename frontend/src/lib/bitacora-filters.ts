import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  bitacoraRowMatchesDateFilter,
  createDefaultBitacoraDateFilter,
  isBitacoraDateFilterActive,
  resolveBitacoraDateBounds,
  type BitacoraDateFilter,
} from '@/lib/bitacora-date-filter'

export type BitacoraBillableFilter = 'all' | 'billable' | 'non-billable'

export type BitacoraFilters = {
  billable: BitacoraBillableFilter
  date: BitacoraDateFilter
  companyId: string
  companyName: string
}

export const BITACORA_BILLABLE_OPTIONS: {
  value: BitacoraBillableFilter
  label: string
}[] = [
  { value: 'all', label: 'Facturable y no facturable' },
  { value: 'billable', label: 'Solo facturables' },
  { value: 'non-billable', label: 'Solo no facturables' },
]

export function createDefaultBitacoraFilters(): BitacoraFilters {
  return {
    billable: 'all',
    date: createDefaultBitacoraDateFilter(),
    companyId: '',
    companyName: '',
  }
}

export function countActiveBitacoraFilters(
  filters: BitacoraFilters,
  options?: { includeBillable?: boolean },
): number {
  const includeBillable = options?.includeBillable !== false
  let n = 0
  if (includeBillable && filters.billable !== 'all') n += 1
  if (isBitacoraDateFilterActive(filters.date)) n += 1
  if (filters.companyId.trim()) n += 1
  return n
}

export function countActiveBitacoraDashboardFilters(filters: BitacoraFilters): number {
  return countActiveBitacoraFilters(filters, { includeBillable: false })
}

export function bitacoraRowMatchesFilters(
  row: BitacoraListItem,
  filters: BitacoraFilters,
): boolean {
  if (filters.billable === 'billable' && !row.isBillable) return false
  if (filters.billable === 'non-billable' && row.isBillable) return false
  if (!bitacoraRowMatchesDateFilter(row.workDate, filters.date)) return false
  if (filters.companyId.trim()) {
    if (row.companyId) {
      return row.companyId === filters.companyId.trim()
    }
    return (
      row.companyName?.trim().toLowerCase() ===
      filters.companyName.trim().toLowerCase()
    )
  }
  return true
}

export type BitacoraServerListQuery = {
  mine?: 'true'
  billable?: 'true' | 'false'
  workDateFrom?: string
  workDateTo?: string
  companyId?: string
}

export function bitacoraFiltersToServerQuery(
  filters: BitacoraFilters,
  mineOnly = false,
): BitacoraServerListQuery {
  const query: BitacoraServerListQuery = {}
  if (mineOnly) query.mine = 'true'
  if (filters.billable === 'billable') query.billable = 'true'
  if (filters.billable === 'non-billable') query.billable = 'false'

  const bounds = resolveBitacoraDateBounds(filters.date)
  if (bounds.from) query.workDateFrom = bounds.from
  if (bounds.to) query.workDateTo = bounds.to

  const companyId = filters.companyId.trim()
  if (companyId) query.companyId = companyId

  return query
}

export function bitacoraFiltersResetKey(filters: BitacoraFilters, listScope: string): string {
  const bounds = resolveBitacoraDateBounds(filters.date)
  return [
    listScope,
    filters.billable,
    bounds.from ?? '',
    bounds.to ?? '',
    filters.companyId.trim(),
  ].join('|')
}
