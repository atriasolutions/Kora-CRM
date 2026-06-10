import type { ProjectListItem } from '@/data/projects.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import { hasElevatedTenantScope } from '@/lib/access-profile-admin'
import type { AccessProfile } from '@/types/access-profile'
import {
  createListScopeOptions,
  sortByRecentlyViewed,
  type ListScope,
  type ListScopeOption,
} from '@/lib/list-scope'
import { isUserOnProjectTeam } from '@/lib/project-team-access'

export const PROJECT_RECENT_SLUG: EntityRecentSlug = 'proyectos'

export type ProjectListScope = ListScope

const PROJECT_LIST_SCOPE_ALL = createListScopeOptions({
  mineLabel: 'Mis proyectos',
  allLabel: 'Todos los proyectos',
  mineDescription: 'Proyectos donde figuras en el equipo (pestaña Equipo)',
})

/** Opciones completas (incluye «Todos»); solo administrador en UI. */
export const PROJECT_LIST_SCOPE_OPTIONS = PROJECT_LIST_SCOPE_ALL

export const PROJECT_SCOPE_SHORT_LABELS: Record<ProjectListScope, string> = {
  mine: 'Mis Proyectos',
  all: 'Todos',
  recent: 'Recientes',
}

/** Perfil Administrador (sistema): puede ver todos los proyectos del módulo. */
export function canViewAllProjects(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): boolean {
  return hasElevatedTenantScope(profile)
}

export function projectListScopeOptionsForProfile(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): ListScopeOption[] {
  if (canViewAllProjects(profile)) return PROJECT_LIST_SCOPE_ALL
  return PROJECT_LIST_SCOPE_ALL.filter((o) => o.id !== 'all')
}

export function defaultProjectListScope(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): ProjectListScope {
  return canViewAllProjects(profile) ? 'all' : 'mine'
}

/** Evita quedar en «Todos» si el perfil no es administrador. */
export function normalizeProjectListScope(
  scope: ProjectListScope,
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): ProjectListScope {
  if (scope === 'all' && !canViewAllProjects(profile)) return 'mine'
  return scope
}

export function projectMatchesListScope(
  row: ProjectListItem,
  scope: ProjectListScope,
  recentIds: string[],
): boolean {
  if (scope === 'mine') {
    return isUserOnProjectTeam(row)
  }
  if (scope === 'recent') {
    return recentIds.includes(row.id)
  }
  return true
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
