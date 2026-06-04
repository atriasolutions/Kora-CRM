import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { projectCustomerFromOpportunity } from '@/lib/project-customer'
import { findQuoteById } from '@/lib/quote-lookup'
import type { ProjectFormValues } from '@/lib/project-form'

export function applyProjectRelationsChange(
  current: Pick<ProjectFormValues, 'acceptedQuoteId' | 'acceptedQuoteCode'>,
  opportunityId: string,
  opportunity?: OpportunityListItem,
  allQuotes: QuoteListItem[] = [],
): Partial<ProjectFormValues> {
  const next: Partial<ProjectFormValues> = {
    opportunityId,
    opportunityName: opportunity?.name ?? '',
  }

  if (opportunity) {
    Object.assign(next, projectCustomerFromOpportunity(opportunity))
  }

  if (!opportunityId.trim()) {
    next.acceptedQuoteId = ''
    next.acceptedQuoteCode = ''
    return next
  }

  const quoteId = current.acceptedQuoteId?.trim()
  if (!quoteId) {
    next.acceptedQuoteId = ''
    next.acceptedQuoteCode = ''
    return next
  }

  const quote = findQuoteById(allQuotes, quoteId)
  if (quote?.opportunityId === opportunityId) {
    next.acceptedQuoteId = quoteId
    next.acceptedQuoteCode = quote.code
  } else {
    next.acceptedQuoteId = ''
    next.acceptedQuoteCode = ''
  }

  return next
}

export function applyProjectQuoteChange(
  quoteId: string,
  quote?: QuoteListItem,
): Partial<ProjectFormValues> {
  return {
    acceptedQuoteId: quoteId,
    acceptedQuoteCode: quote?.code ?? '',
  }
}
