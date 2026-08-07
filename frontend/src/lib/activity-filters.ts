import type {
  ActivityListItem,
  ActivityPriority,
  ActivityStatus,
} from '@/data/activities.mock'
import { ACTIVITY_STATUS_OPTIONS } from '@/data/activities.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { ACTIVITY_TYPE_OPTIONS } from '@/lib/contact-activity'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type ActivityDueFilter = 'all' | 'today' | 'tomorrow' | 'overdue'

export type ActivityFilters = {
  statuses: ActivityStatus[]
  types: ContactActivityType[]
  priorities: ActivityPriority[]
  due: ActivityDueFilter
  date: ListDateFilter
}

export { ACTIVITY_STATUS_OPTIONS }

export const ACTIVITY_TYPE_FILTER_OPTIONS = ACTIVITY_TYPE_OPTIONS

export const ACTIVITY_PRIORITY_FILTER_OPTIONS: ActivityPriority[] = ['Alta', 'Media', 'Baja']

export const ACTIVITY_DUE_OPTIONS: { value: ActivityDueFilter; label: string }[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'overdue', label: 'Vencidas' },
]

export function createDefaultActivityFilters(): ActivityFilters {
  return {
    statuses: [],
    types: [],
    priorities: [],
    due: 'all',
    date: createDefaultListDateFilter(),
  }
}

export function countActiveActivityFilters(filters: ActivityFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.types.length > 0) n += 1
  if (filters.priorities.length > 0) n += 1
  if (filters.due !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

function matchesDue(due: string, filter: ActivityDueFilter): boolean {
  const v = due.toLowerCase()
  switch (filter) {
    case 'today':
      return v.includes('hoy')
    case 'tomorrow':
      return v.includes('mañana')
    case 'overdue':
      return v.includes('may') && !v.includes('hoy') && !v.includes('mañana')
    default:
      return true
  }
}

export function activityHasClientOnlyFilters(filters: ActivityFilters): boolean {
  return (
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.due !== 'all'
  )
}

export function activityRowMatchesFilters(
  row: ActivityListItem,
  filters: ActivityFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false
  if (filters.types.length > 0 && !filters.types.includes(row.type)) return false
  if (filters.priorities.length > 0 && !filters.priorities.includes(row.priority)) {
    return false
  }
  if (!matchesDue(row.due, filters.due)) return false
  const dateKey = row.scheduledAt?.slice(0, 10) || row.createdAt
  if (!listRowMatchesDateFilter(dateKey, filters.date)) return false
  return true
}

export function activityFiltersToServerQuery(
  filters: ActivityFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.assigneeName = options.ownerName.trim()
  }
  return query
}
