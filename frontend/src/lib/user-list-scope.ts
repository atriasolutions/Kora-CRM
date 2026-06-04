import type { UserListItem } from '@/data/users.mock'
import { CURRENT_USER } from '@/lib/current-user'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const USER_RECENT_SLUG: EntityRecentSlug = 'usuarios'

export type UserListScope = ListScope

export const USER_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mi perfil',
  allLabel: 'Todos los usuarios',
  mineDescription: 'Tu usuario en el equipo',
})

export const USER_SCOPE_SHORT_LABELS: Record<UserListScope, string> = {
  mine: 'Mi Perfil',
  all: 'Todos',
  recent: 'Recientes',
}

export function userMatchesListScope(
  row: UserListItem,
  scope: UserListScope,
  recentIds: string[],
): boolean {
  if (scope === 'mine') return row.id === CURRENT_USER.id
  return matchesListScope(row, scope, (r) => r.name, recentIds)
}

export function sortUsersByRecentlyViewed(
  rows: UserListItem[],
  recentIds: string[],
): UserListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadUserRecentIds(): string[] {
  return loadRecentlyViewedIds(USER_RECENT_SLUG)
}
