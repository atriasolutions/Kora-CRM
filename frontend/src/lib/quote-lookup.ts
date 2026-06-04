import type { QuoteListItem } from '@/data/quotes.mock'

export function findQuoteById(
  quotes: QuoteListItem[],
  id: string,
): QuoteListItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  return quotes.find((q) => q.id === trimmed)
}

export function searchQuotes(
  quotes: QuoteListItem[],
  query: string,
  options?: {
    statusFilter?: QuoteListItem['status']
    opportunityId?: string
    limit?: number
  },
): QuoteListItem[] {
  const limit = options?.limit ?? 12
  let pool = quotes
  if (options?.opportunityId?.trim()) {
    pool = pool.filter((q) => q.opportunityId === options.opportunityId)
  }
  if (options?.statusFilter) {
    pool = pool.filter((q) => q.status === options.statusFilter)
  }
  const q = query.trim().toLowerCase()
  if (!q) return pool.slice(0, limit)
  return pool
    .filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.opportunityName.toLowerCase().includes(q),
    )
    .slice(0, limit)
}
