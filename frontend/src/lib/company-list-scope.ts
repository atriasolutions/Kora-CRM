import type { CompanyListItem } from '@/data/companies.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const COMPANY_RECENT_SLUG: EntityRecentSlug = 'empresas'

export type CompanyListScope = ListScope

export const COMPANY_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis empresas',
  allLabel: 'Todas las empresas',
})

export const COMPANY_SCOPE_SHORT_LABELS: Record<CompanyListScope, string> = {
  mine: 'Mis Empresas',
  all: 'Todos',
  recent: 'Recientes',
}

export function companyMatchesListScope(
  row: CompanyListItem,
  scope: CompanyListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortCompaniesByRecentlyViewed(
  rows: CompanyListItem[],
  recentIds: string[],
): CompanyListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadCompanyRecentIds(): string[] {
  return loadRecentlyViewedIds(COMPANY_RECENT_SLUG)
}
