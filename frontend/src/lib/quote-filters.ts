import type { QuoteListItem } from '@/data/quotes.mock'
import { QUOTE_JOURNEY_STAGE_OPTIONS, type QuoteStatus } from '@/lib/quote-journey'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type QuoteFilters = {
  statuses: QuoteStatus[]
  date: ListDateFilter
}

export { QUOTE_JOURNEY_STAGE_OPTIONS }

export function createDefaultQuoteFilters(): QuoteFilters {
  return { statuses: [], date: createDefaultListDateFilter() }
}

export function countActiveQuoteFilters(filters: QuoteFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function quoteRowMatchesFilters(row: QuoteListItem, filters: QuoteFilters): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) {
    return false
  }
  const dateKey = row.createdAt || row.issueDate
  if (!listRowMatchesDateFilter(dateKey, filters.date)) return false
  return true
}

export function quoteFiltersToServerQuery(
  filters: QuoteFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}

export function toggleQuoteStatus(
  filters: QuoteFilters,
  status: QuoteStatus,
): QuoteFilters {
  const statuses = filters.statuses.includes(status)
    ? filters.statuses.filter((s) => s !== status)
    : [...filters.statuses, status]
  return { ...filters, statuses }
}
