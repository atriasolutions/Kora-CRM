import type { UserListItem, UserStatus } from '@/data/users.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export const USER_STATUS_OPTIONS: UserStatus[] = [
  'Activo',
  'Invitado',
  'Inactivo',
  'Por verificar',
]

export type UserFilters = {
  statuses: UserStatus[]
  date: ListDateFilter
}

export function createDefaultUserFilters(): UserFilters {
  return {
    statuses: [],
    date: createDefaultListDateFilter(),
  }
}

export function countActiveUserFilters(filters: UserFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function userRowMatchesFilters(
  { status }: UserListItem,
  filters: UserFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(status)) {
    return false
  }
  // La fecha de alta solo se aplica en servidor (el listado no expone createdAt).
  return true
}

export function userFiltersToServerQuery(filters: UserFilters): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  return query
}
