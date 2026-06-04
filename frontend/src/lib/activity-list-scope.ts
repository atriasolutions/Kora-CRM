import type { ActivityListItem } from '@/data/activities.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const ACTIVITY_RECENT_SLUG: EntityRecentSlug = 'actividades'

export type ActivityListScope = ListScope

export const ACTIVITY_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis actividades',
  allLabel: 'Todas las actividades',
  mineDescription: 'Asignadas a ti',
})

export const ACTIVITY_SCOPE_SHORT_LABELS: Record<ActivityListScope, string> = {
  mine: 'Mis Actividades',
  all: 'Todos',
  recent: 'Recientes',
}

export function activityMatchesListScope(
  row: ActivityListItem,
  scope: ActivityListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.assignee, recentIds)
}

export function sortActivitiesByRecentlyViewed(
  rows: ActivityListItem[],
  recentIds: string[],
): ActivityListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadActivityRecentIds(): string[] {
  return loadRecentlyViewedIds(ACTIVITY_RECENT_SLUG)
}
