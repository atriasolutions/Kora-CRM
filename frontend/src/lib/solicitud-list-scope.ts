import type { SolicitudListItem } from '@/data/solicitudes.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import { isSystemAccessProfile } from '@/lib/access-profile-admin'
import type { AccessProfile } from '@/types/access-profile'
import {
  createListScopeOptions,
  sortByRecentlyViewed,
  type ListScope,
  type ListScopeOption,
} from '@/lib/list-scope'
import { isUserOnSolicitudTeam } from '@/lib/solicitud-team-access'

export const SOLICITUD_RECENT_SLUG: EntityRecentSlug = 'solicitudes'

export type SolicitudListScope = ListScope

const SOLICITUD_LIST_SCOPE_ALL = createListScopeOptions({
  mineLabel: 'Mis solicitudes',
  allLabel: 'Todas las solicitudes',
  mineDescription: 'Solicitudes donde eres responsable o figuras en el equipo',
})

export const SOLICITUD_LIST_SCOPE_OPTIONS = SOLICITUD_LIST_SCOPE_ALL

export const SOLICITUD_SCOPE_SHORT_LABELS: Record<SolicitudListScope, string> = {
  mine: 'Mis solicitudes',
  all: 'Todas',
  recent: 'Recientes',
}

export function canViewAllSolicitudes(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): boolean {
  return isSystemAccessProfile(profile)
}

export function solicitudListScopeOptionsForProfile(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): ListScopeOption[] {
  if (canViewAllSolicitudes(profile)) return SOLICITUD_LIST_SCOPE_ALL
  return SOLICITUD_LIST_SCOPE_ALL.filter((o) => o.id !== 'all')
}

export function defaultSolicitudListScope(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): SolicitudListScope {
  return canViewAllSolicitudes(profile) ? 'all' : 'mine'
}

export function normalizeSolicitudListScope(
  scope: SolicitudListScope,
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): SolicitudListScope {
  if (scope === 'all' && !canViewAllSolicitudes(profile)) return 'mine'
  return scope
}

export function solicitudMatchesListScope(
  row: SolicitudListItem,
  scope: SolicitudListScope,
  recentIds: string[],
): boolean {
  if (scope === 'mine') {
    return isUserOnSolicitudTeam(row)
  }
  if (scope === 'recent') {
    return recentIds.includes(row.id)
  }
  return true
}

export function sortSolicitudesByRecentlyViewed(
  rows: SolicitudListItem[],
  recentIds: string[],
): SolicitudListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadSolicitudRecentIds(): string[] {
  return loadRecentlyViewedIds(SOLICITUD_RECENT_SLUG)
}
