import type { QuoteStatus } from '@/data/quotes.mock'
import { quoteStageVariant } from '@/lib/quote-journey'

export function quoteStatusVariant(
  status: QuoteStatus,
): 'muted' | 'proposal' | 'customer' | 'destructive' | 'secondary' | 'negotiation' {
  return quoteStageVariant(status)
}
