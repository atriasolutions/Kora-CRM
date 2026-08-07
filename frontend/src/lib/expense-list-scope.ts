import type { ExpenseListItem } from '@/data/expenses.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const EXPENSE_RECENT_SLUG: EntityRecentSlug = 'gastos'

export type ExpenseListScope = ListScope

export const EXPENSE_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis gastos',
  allLabel: 'Todos los gastos',
})

export const EXPENSE_SCOPE_SHORT_LABELS: Record<ExpenseListScope, string> = {
  mine: 'Mis Gastos',
  all: 'Todos',
  recent: 'Recientes',
}

export function expenseMatchesListScope(
  row: ExpenseListItem,
  scope: ExpenseListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortExpensesByRecentlyViewed(
  rows: ExpenseListItem[],
  recentIds: string[],
): ExpenseListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadExpenseRecentIds(): string[] {
  return loadRecentlyViewedIds(EXPENSE_RECENT_SLUG)
}
