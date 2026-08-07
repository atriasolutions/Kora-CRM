import type {
  ProjectHealth,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from '@/data/projects.mock'
import {
  PROJECT_HEALTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from '@/data/projects.mock'
import type { ProjectJourneyStage } from '@/lib/project-journey'
import { PROJECT_JOURNEY_STAGE_OPTIONS } from '@/lib/project-journey'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type ProjectDeadlineFilter = 'all' | 'month' | 'overdue'

export type ProjectFilters = {
  statuses: ProjectStatus[]
  journeyStages: ProjectJourneyStage[]
  priorities: ProjectPriority[]
  health: ProjectHealth[]
  deadline: ProjectDeadlineFilter
  date: ListDateFilter
}

export {
  PROJECT_STATUS_OPTIONS,
  PROJECT_JOURNEY_STAGE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_HEALTH_OPTIONS,
}

export const PROJECT_DEADLINE_OPTIONS: {
  value: ProjectDeadlineFilter
  label: string
}[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'month', label: 'Este mes' },
  { value: 'overdue', label: 'Con retraso' },
]

export function createDefaultProjectFilters(): ProjectFilters {
  return {
    statuses: [],
    journeyStages: [],
    priorities: [],
    health: [],
    deadline: 'all',
    date: createDefaultListDateFilter(),
  }
}

export function countActiveProjectFilters(filters: ProjectFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.journeyStages.length > 0) n += 1
  if (filters.priorities.length > 0) n += 1
  if (filters.health.length > 0) n += 1
  if (filters.deadline !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

function matchesDeadline(deadline: string, health: ProjectHealth, filter: ProjectDeadlineFilter): boolean {
  switch (filter) {
    case 'month':
      return deadline.toLowerCase().includes('jun') || deadline.toLowerCase().includes('jul')
    case 'overdue':
      return health === 'Retrasado' || health === 'En riesgo'
    default:
      return true
  }
}

export function projectRowMatchesFilters(
  row: ProjectListItem,
  filters: ProjectFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false
  if (filters.journeyStages.length > 0 && !filters.journeyStages.includes(row.journeyStage)) {
    return false
  }
  if (filters.priorities.length > 0 && !filters.priorities.includes(row.priority)) {
    return false
  }
  if (filters.health.length > 0 && !filters.health.includes(row.health)) return false
  if (!matchesDeadline(row.deadline, row.health, filters.deadline)) return false
  if (!listRowMatchesDateFilter(row.createdAt, filters.date)) return false
  return true
}

export function projectFiltersToServerQuery(
  filters: ProjectFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (filters.journeyStages.length > 0) {
    query.journeyStage = filters.journeyStages.join(',')
  }
  if (filters.priorities.length > 0) {
    query.priority = filters.priorities.join(',')
  }
  if (filters.health.length > 0) {
    query.health = filters.health.join(',')
  }
  if (filters.deadline !== 'all') {
    query.deadline = filters.deadline
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}
