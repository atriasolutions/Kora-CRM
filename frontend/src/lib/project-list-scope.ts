import type { ProjectListItem } from '@/data/projects.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const PROJECT_RECENT_SLUG: EntityRecentSlug = 'proyectos'

export type ProjectListScope = ListScope

export const PROJECT_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis proyectos',
  allLabel: 'Todos los proyectos',
  mineDescription: 'Donde eres responsable del proyecto',
})

export const PROJECT_SCOPE_SHORT_LABELS: Record<ProjectListScope, string> = {
  mine: 'Mis Proyectos',
  all: 'Todos',
  recent: 'Recientes',
}

export function projectMatchesListScope(
  row: ProjectListItem,
  scope: ProjectListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.manager, recentIds)
}

export function sortProjectsByRecentlyViewed(
  rows: ProjectListItem[],
  recentIds: string[],
): ProjectListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadProjectRecentIds(): string[] {
  return loadRecentlyViewedIds(PROJECT_RECENT_SLUG)
}
