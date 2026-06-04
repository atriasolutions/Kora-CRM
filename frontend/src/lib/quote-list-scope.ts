import type { QuoteListItem } from '@/data/quotes.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const QUOTE_RECENT_SLUG: EntityRecentSlug = 'cotizaciones'

export type QuoteListScope = ListScope

export const QUOTE_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis cotizaciones',
  allLabel: 'Todas las cotizaciones',
})

export const QUOTE_SCOPE_SHORT_LABELS: Record<QuoteListScope, string> = {
  mine: 'Mis Cotizaciones',
  all: 'Todos',
  recent: 'Recientes',
}

export function quoteMatchesListScope(
  row: QuoteListItem,
  scope: QuoteListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortQuotesByRecentlyViewed(
  rows: QuoteListItem[],
  recentIds: string[],
): QuoteListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadQuoteRecentIds(): string[] {
  return loadRecentlyViewedIds(QUOTE_RECENT_SLUG)
}
