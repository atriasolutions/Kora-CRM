import type { QuoteListItem } from '@/data/quotes.mock'

let registrySnapshot: QuoteListItem[] = []

export function syncRegistryQuotes(quotes: QuoteListItem[]) {
  registrySnapshot = quotes
}

export function getRegistryQuoteById(id: string): QuoteListItem | undefined {
  return registrySnapshot.find((q) => q.id === id)
}

export function getAllKnownQuotes(): QuoteListItem[] {
  return registrySnapshot
}
