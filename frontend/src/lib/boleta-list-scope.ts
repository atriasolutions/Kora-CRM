import type { BoletaListItem } from '@/data/boletas.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const BOLETA_RECENT_SLUG: EntityRecentSlug = 'boletas'

export type BoletaListScope = ListScope

export const BOLETA_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis boletas',
  allLabel: 'Todas las boletas',
})

export const BOLETA_SCOPE_SHORT_LABELS: Record<BoletaListScope, string> = {
  mine: 'Mis Boletas',
  all: 'Todos',
  recent: 'Recientes',
}

export function boletaMatchesListScope(
  row: BoletaListItem,
  scope: BoletaListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortBoletasByRecentlyViewed(
  rows: BoletaListItem[],
  recentIds: string[],
): BoletaListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadBoletaRecentIds(): string[] {
  return loadRecentlyViewedIds(BOLETA_RECENT_SLUG)
}
