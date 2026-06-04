import { opportunityListSeed } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { getAllKnownQuotes } from '@/data/quotes-registry-store'

export type OpportunityQuoteSummary = Pick<
  QuoteListItem,
  'id' | 'code' | 'title' | 'amount' | 'status' | 'validUntil'
>

export function quotesForOpportunity(opportunityId: string): QuoteListItem[] {
  return getAllKnownQuotes().filter((q) => q.opportunityId === opportunityId)
}

export function quotesForCompany(companyName: string): QuoteListItem[] {
  return getAllKnownQuotes().filter((q) => q.companyName === companyName)
}

export function quoteSummariesFromListItems(
  items: Pick<
    QuoteListItem,
    'id' | 'code' | 'title' | 'amount' | 'status' | 'validUntil'
  >[],
): OpportunityQuoteSummary[] {
  return items.map(({ id, code, title, amount, status, validUntil }) => ({
    id,
    code,
    title,
    amount,
    status,
    validUntil,
  }))
}

export function quoteSummariesForOpportunity(
  opportunityId: string,
): OpportunityQuoteSummary[] {
  return quoteSummariesFromListItems(quotesForOpportunity(opportunityId))
}

export function opportunityIdsForCompany(companyName: string): string[] {
  return opportunityListSeed
    .filter((o) => o.company === companyName)
    .map((o) => o.id)
}
