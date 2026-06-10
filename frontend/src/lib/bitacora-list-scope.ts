import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import { hasElevatedTenantScope, isGuestAccessProfile } from '@/lib/access-profile-admin'
import type { AccessProfile } from '@/types/access-profile'
import { getCurrentUser } from '@/lib/current-user'
import {
  createListScopeOptions,
  sortByRecentlyViewed,
  type ListScope,
  type ListScopeOption,
} from '@/lib/list-scope'

export const BITACORA_RECENT_SLUG: EntityRecentSlug = 'bitacora'

export type BitacoraListScope = ListScope

const BITACORA_LIST_SCOPE_ALL = createListScopeOptions({
  mineLabel: 'Mis bitácoras',
  allLabel: 'Todas las bitácoras',
  mineDescription: 'Registros donde figuras como usuario asignado',
})

export const BITACORA_LIST_SCOPE_OPTIONS = BITACORA_LIST_SCOPE_ALL

export const BITACORA_SCOPE_SHORT_LABELS: Record<BitacoraListScope, string> = {
  mine: 'Mis bitácoras',
  all: 'Todas',
  recent: 'Recientes',
}

export function canViewAllBitacora(
  profile: Pick<AccessProfile, 'isSystem' | 'systemKey'> | null | undefined,
): boolean {
  return hasElevatedTenantScope(profile) || isGuestAccessProfile(profile)
}

export function bitacoraListScopeOptionsForProfile(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): ListScopeOption[] {
  if (canViewAllBitacora(profile)) return BITACORA_LIST_SCOPE_ALL
  return BITACORA_LIST_SCOPE_ALL.filter((o) => o.id !== 'all')
}

export function defaultBitacoraListScope(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): BitacoraListScope {
  return canViewAllBitacora(profile) ? 'all' : 'mine'
}

export function normalizeBitacoraListScope(
  scope: BitacoraListScope,
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): BitacoraListScope {
  if (scope === 'all' && !canViewAllBitacora(profile)) return 'mine'
  return scope
}

export function bitacoraMatchesListScope(
  row: BitacoraListItem,
  scope: BitacoraListScope,
  recentIds: string[],
): boolean {
  if (scope === 'mine') {
    const user = getCurrentUser()
    if (row.assignedUserId && user.id) {
      return row.assignedUserId === user.id
    }
    return row.assignedUserName.trim().toLowerCase() === user.name.trim().toLowerCase()
  }
  if (scope === 'recent') {
    return recentIds.includes(row.id)
  }
  return true
}

export function sortBitacoraByRecentlyViewed(
  rows: BitacoraListItem[],
  recentIds: string[],
): BitacoraListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadBitacoraRecentIds(): string[] {
  return loadRecentlyViewedIds(BITACORA_RECENT_SLUG)
}
