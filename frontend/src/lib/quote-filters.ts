import type { QuoteListItem } from '@/data/quotes.mock'
import { QUOTE_JOURNEY_STAGE_OPTIONS, type QuoteStatus } from '@/lib/quote-journey'

export type QuoteFilters = {
  statuses: QuoteStatus[]
}

export { QUOTE_JOURNEY_STAGE_OPTIONS }

export function createDefaultQuoteFilters(): QuoteFilters {
  return { statuses: [] }
}

export function countActiveQuoteFilters(filters: QuoteFilters): number {
  return filters.statuses.length > 0 ? 1 : 0
}

export function quoteRowMatchesFilters(row: QuoteListItem, filters: QuoteFilters): boolean {
  if (filters.statuses.length === 0) return true
  return filters.statuses.includes(row.status)
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
