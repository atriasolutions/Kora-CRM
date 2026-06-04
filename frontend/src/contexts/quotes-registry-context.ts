import { createContext } from 'react'

import type { QuoteDetail } from '@/data/quote-detail.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import type { CreateQuoteFormValues } from '@/lib/quote-create'
import type { ArchivedQuoteRecord } from '@/lib/quote-archive'

export type ArchivedQuoteEntry = ArchivedQuoteRecord & {
  quote: QuoteListItem
}

export type QuotesRegistryContextValue = {
  userQuotes: QuoteListItem[]
  allQuotes: QuoteListItem[]
  archivedQuotes: ArchivedQuoteEntry[]
  findById: (id: string) => QuoteListItem | undefined
  addQuote: (values: CreateQuoteFormValues) => Promise<QuoteListItem>
  updateQuoteFromDetail: (detail: QuoteDetail) => Promise<QuoteDetail>
  archiveQuote: (id: string) => Promise<void>
  archiveQuotes: (ids: string[]) => Promise<void>
  restoreQuote: (id: string) => Promise<void>
  restoreQuotes: (ids: string[]) => Promise<void>
  permanentlyDeleteQuote: (id: string) => Promise<void>
  permanentlyDeleteQuotes: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  quotesForOpportunity: (opportunityId: string) => QuoteListItem[]
  reloadFromApi: () => Promise<void>
}

export const QuotesRegistryContext = createContext<QuotesRegistryContextValue | null>(null)
