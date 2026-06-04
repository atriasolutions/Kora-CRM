import type { QuoteLineItem } from '@/data/quote-detail.mock'

export type QuoteDetailOverride = {
  lineItems?: QuoteLineItem[]
  subtotal?: string
  discountPercent?: string
  discountAmount?: string
  taxPercent?: string
  taxAmount?: string
  amount?: string
  description?: string
  destinationWarehouseId?: string
  destinationWarehouse?: string
  deliveryAddress?: string
}

export function loadQuoteDetailOverride(_quoteId: string): QuoteDetailOverride | null {
  return null
}

export function persistQuoteDetailOverride(
  _quoteId: string,
  _override: QuoteDetailOverride,
) {
  /* sin persistencia local */
}

export function removeQuoteDetailOverride(_quoteId: string) {
  /* sin persistencia local */
}
