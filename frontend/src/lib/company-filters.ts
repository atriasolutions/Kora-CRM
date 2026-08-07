import type {
  CompanyLifecycleStatus,
  CompanyListItem,
  CompanyOperationalStatus,
} from '@/data/companies.mock'
import { normalizeCompanyLifecycle } from '@/lib/company-form'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type CompanyLastActivityFilter = 'all' | 'today' | 'week' | 'stale'

export type CompanyFilters = {
  lifecycles: CompanyLifecycleStatus[]
  operationalStatus: CompanyOperationalStatus | 'all'
  lastActivity: CompanyLastActivityFilter
  date: ListDateFilter
}

export const COMPANY_LIFECYCLE_OPTIONS: CompanyLifecycleStatus[] = [
  'Prospecto',
  'Cliente',
  'Proveedor',
]

export const COMPANY_OPERATIONAL_OPTIONS: {
  value: CompanyOperationalStatus
  label: string
}[] = [
  { value: 'Activa', label: 'Activa' },
  { value: 'Inactiva', label: 'Inactiva' },
]

export const COMPANY_LAST_ACTIVITY_OPTIONS: {
  value: CompanyLastActivityFilter
  label: string
}[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Hoy o ayer' },
  { value: 'stale', label: 'Sin seguimiento reciente' },
]

export function createDefaultCompanyFilters(): CompanyFilters {
  return {
    lifecycles: [],
    operationalStatus: 'all',
    lastActivity: 'all',
    date: createDefaultListDateFilter(),
  }
}

export function countActiveCompanyFilters(filters: CompanyFilters): number {
  let n = 0
  if (filters.lifecycles.length > 0) n += 1
  if (filters.operationalStatus !== 'all') n += 1
  if (filters.lastActivity !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

function matchesLastActivity(label: string, filter: CompanyLastActivityFilter): boolean {
  const v = label.toLowerCase()
  switch (filter) {
    case 'today':
      return v.includes('hoy')
    case 'week':
      return v.includes('hoy') || v.includes('ayer')
    case 'stale':
      return !v.includes('hoy') && !v.includes('ayer')
    default:
      return true
  }
}

export function matchesCompanyFilters(
  company: CompanyListItem,
  filters: CompanyFilters,
): boolean {
  if (
    filters.lifecycles.length > 0 &&
    !filters.lifecycles.includes(normalizeCompanyLifecycle(company.lifecycle))
  ) {
    return false
  }
  if (
    filters.operationalStatus !== 'all' &&
    company.operationalStatus !== filters.operationalStatus
  ) {
    return false
  }
  if (!matchesLastActivity(company.lastActivity, filters.lastActivity)) {
    return false
  }
  if (!listRowMatchesDateFilter(company.createdAt, filters.date)) return false
  return true
}

export function companyFiltersToServerQuery(
  filters: CompanyFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.lifecycles.length > 0) {
    query.lifecycle = filters.lifecycles.join(',')
  }
  if (filters.operationalStatus !== 'all') {
    query.operationalStatus = filters.operationalStatus
  }
  if (filters.lastActivity !== 'all') {
    query.lastActivity = filters.lastActivity
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}

export function toggleCompanyLifecycle(
  filters: CompanyFilters,
  lifecycle: CompanyLifecycleStatus,
): CompanyFilters {
  const has = filters.lifecycles.includes(lifecycle)
  return {
    ...filters,
    lifecycles: has
      ? filters.lifecycles.filter((s) => s !== lifecycle)
      : [...filters.lifecycles, lifecycle],
  }
}

export function companyRowMatchesFilters(
  row: CompanyListItem,
  filters: CompanyFilters,
): boolean {
  return matchesCompanyFilters(row, filters)
}
