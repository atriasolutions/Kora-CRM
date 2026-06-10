import type { QuoteDetail } from '@/data/quote-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { QuoteListItem, QuoteStatus } from '@/data/quotes.mock'
import { saleCustomerDisplayName } from '@/lib/sale-customer'
import type { SaleCustomerKind } from '@/lib/sale-customer'
import { QUOTE_JOURNEY_STAGE_OPTIONS } from '@/lib/quote-journey'
import { DEFAULT_GLOBAL_DISCOUNT } from '@/lib/document-global-discount'
import { computeQuoteTotals } from '@/lib/quote-line-item'
import type { QuoteLineItem } from '@/data/quote-detail.mock'

export const QUOTE_STATUS_OPTIONS: QuoteStatus[] = QUOTE_JOURNEY_STAGE_OPTIONS

export type QuoteFormValues = {
  code: string
  title: string
  status: QuoteStatus
  validUntil: string
  ownerName: string
  customerKind: SaleCustomerKind
  contactId: string
  companyId: string
  opportunityId: string
  opportunityName: string
  companyName: string
  contactName: string
  contactEmail: string
  description: string
  paymentTerms: string
  deliveryTerms: string
  billingAddress: string
  destinationWarehouseId: string
  destinationWarehouse: string
  deliveryAddress: string
  terms: string
  internalNotes: string
  globalDiscountPercent: string
  includeBankDetails: boolean
  bankAccountId: string
}

export function quoteDetailToFormValues(quote: QuoteDetail): QuoteFormValues {
  return {
    code: quote.code,
    title: quote.title,
    status: quote.status,
    validUntil: quote.validUntil,
    ownerName: quote.owner,
    customerKind: quote.customerKind ?? (quote.contactId ? 'contacto' : 'empresa'),
    contactId: quote.contactId ?? '',
    companyId: quote.companyId ?? '',
    opportunityId: quote.opportunityId,
    opportunityName: quote.opportunityName,
    companyName: quote.companyName ?? '',
    contactName: quote.contactName ?? '',
    contactEmail: quote.contactEmail ?? '',
    description: quote.description,
    paymentTerms: quote.paymentTerms,
    deliveryTerms: quote.deliveryTerms,
    billingAddress: quote.billingAddress,
    destinationWarehouseId: quote.destinationWarehouseId ?? '',
    destinationWarehouse: quote.destinationWarehouse,
    deliveryAddress: quote.deliveryAddress,
    terms: quote.terms,
    internalNotes: quote.internalNotes,
    globalDiscountPercent: quote.discountPercent ?? DEFAULT_GLOBAL_DISCOUNT,
    includeBankDetails: quote.includeBankDetails === true,
    bankAccountId: quote.bankAccountId ?? '',
  }
}

export function applyFormValuesToQuote(
  quote: QuoteDetail,
  values: QuoteFormValues,
  lineItems?: QuoteLineItem[],
): QuoteDetail {
  const items = lineItems ?? quote.lineItems
  const totals = computeQuoteTotals(items, {
    globalDiscountPercent: values.globalDiscountPercent,
  })
  return {
    ...quote,
    code: quote.code,
    title: values.title.trim(),
    status: values.status,
    validUntil: values.validUntil.trim(),
    owner: values.ownerName.trim(),
    opportunityName: values.opportunityName.trim(),
    customerKind: values.customerKind,
    contactId: values.contactId.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    companyName: saleCustomerDisplayName({
      customerKind: values.customerKind,
      contactId: values.contactId,
      contactName: values.contactName,
      companyId: values.companyId,
      companyName: values.companyName,
    }),
    contactName: values.contactName.trim(),
    contactEmail: values.contactEmail.trim(),
    description: values.description.trim(),
    paymentTerms: values.paymentTerms.trim(),
    deliveryTerms: values.deliveryTerms.trim(),
    billingAddress: values.billingAddress.trim(),
    destinationWarehouseId: values.destinationWarehouseId.trim() || undefined,
    destinationWarehouse: values.destinationWarehouse.trim(),
    deliveryAddress: values.deliveryAddress.trim(),
    terms: values.terms.trim(),
    internalNotes: values.internalNotes.trim(),
    lineItems: items,
    subtotal: totals.subtotal,
    taxableSubtotal: totals.taxableSubtotal,
    exemptSubtotal: totals.exemptSubtotal,
    discountPercent: totals.discountPercent,
    discountAmount: totals.discountAmount,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    amount: totals.amount,
    includeBankDetails: values.includeBankDetails,
    bankAccountId: values.bankAccountId.trim() || null,
  }
}

export function listItemFromQuoteDetail(quote: QuoteDetail): QuoteListItem {
  const {
    contactName: _cn,
    contactEmail: _ce,
    version: _v,
    currency: _cur,
    description: _d,
    subtotal: _s,
    discountPercent: _dp,
    discountAmount: _da,
    taxPercent: _tp,
    taxAmount: _ta,
    paymentTerms: _pt,
    deliveryTerms: _dt,
    billingAddress: _ba,
    sentAt: _sa,
    lineItems: _li,
    statusHistory: _sh,
    terms: _t,
    internalNotes: _in,
    activities: _a,
    notes: _n,
    ...list
  } = quote
  return stampRecordAuditOnUpdate(list)
}
