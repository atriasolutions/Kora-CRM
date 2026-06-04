import type { ContactListItem } from '@/data/contacts.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'

export function archivedStoreFromList<T extends { id: string }>(
  items: T[],
): Record<string, { id: string; archivedAt: number; snapshot: T }> {
  const now = Date.now()
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      { id: item.id, archivedAt: now, snapshot: item },
    ]),
  )
}

export type ArchivedContactStore = ReturnType<
  typeof archivedStoreFromList<ContactListItem>
>
export type ArchivedCompanyStore = ReturnType<
  typeof archivedStoreFromList<CompanyListItem>
>
export type ArchivedOpportunityStore = ReturnType<
  typeof archivedStoreFromList<OpportunityListItem>
>
export type ArchivedQuoteStore = ReturnType<
  typeof archivedStoreFromList<QuoteListItem>
>
