import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const OPPORTUNITY_RECENT_SLUG: EntityRecentSlug = 'oportunidades'

export type OpportunityListScope = ListScope

export const OPPORTUNITY_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis oportunidades',
  allLabel: 'Todas las oportunidades',
})

export const OPPORTUNITY_SCOPE_SHORT_LABELS: Record<OpportunityListScope, string> = {
  mine: 'Mis Oportunidades',
  all: 'Todos',
  recent: 'Recientes',
}

export function opportunityMatchesListScope(
  row: OpportunityListItem,
  scope: OpportunityListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortOpportunitiesByRecentlyViewed(
  rows: OpportunityListItem[],
  recentIds: string[],
): OpportunityListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadOpportunityRecentIds(): string[] {
  return loadRecentlyViewedIds(OPPORTUNITY_RECENT_SLUG)
}
