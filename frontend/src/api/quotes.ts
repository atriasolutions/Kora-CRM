import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { QuoteDetail, QuoteLineItem } from '@/data/quote-detail.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import type { CreateQuoteFormValues } from '@/lib/quote-create'
import { normalizeProductCurrency } from '@/lib/currency'
import { parseProductPrice } from '@/lib/product-currency-input'
import { parseMoneyNum } from '@/lib/product-pricing'

const BASE = `${API_V1}/quotes`

export type QuoteApiBody = {
  code?: string
  title: string
  opportunityId?: string | null
  companyId?: string | null
  contactId?: string | null
  amount?: string
  status?: string
  validUntil?: string
  issueDate?: string
  owner?: string
  customerKind?: string
  paymentTerms?: string
  deliveryTerms?: string
  terms?: string
  globalDiscount?: string
  lineItems?: {
    sku?: string
    productName?: string
    description?: string
    quantity?: number
    unitPrice?: string
    unitPriceOriginal?: number
    priceCurrency?: string
    discount?: string
    productId?: string | null
  }[]
}

/** Cotización aceptada: las líneas no deben modificarse (reservas de stock). */
export function quoteLineItemsLocked(status: string): boolean {
  return status === 'Aceptada'
}

function quoteLineOriginalAmount(li: QuoteLineItem): number {
  if (li.unitPriceOriginalNum != null && Number.isFinite(li.unitPriceOriginalNum)) {
    return li.unitPriceOriginalNum
  }
  const currency = normalizeProductCurrency(li.priceCurrency)
  if (li.unitPriceOriginal?.trim()) {
    return parseProductPrice(li.unitPriceOriginal, currency)
  }
  return parseMoneyNum(li.unitPrice)
}

function quoteLinesToApi(lineItems: QuoteLineItem[] | undefined) {
  const meaningful = (lineItems ?? []).filter((li) => li.description.trim())
  if (meaningful.length === 0) return undefined
  return meaningful.map((li) => ({
    sku: li.sku.trim() || undefined,
    productName: li.description,
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    unitPriceOriginal: quoteLineOriginalAmount(li),
    priceCurrency: li.priceCurrency ?? 'CLP',
    discount: li.discount,
    productId: li.productId?.trim() ? li.productId : null,
  }))
}

export function quoteFormToApiBody(values: CreateQuoteFormValues): QuoteApiBody {
  return {
    code: values.code?.trim() || undefined,
    title: values.title.trim(),
    opportunityId: values.opportunityId?.trim() || null,
    companyId: values.companyId?.trim() || null,
    contactId: values.contactId?.trim() || null,
    amount: values.amount?.trim() || undefined,
    status: values.status,
    validUntil: values.validUntil?.trim() || undefined,
    owner: values.ownerName?.trim() || undefined,
    customerKind: values.customerKind,
    paymentTerms: values.paymentTerms?.trim() || undefined,
    deliveryTerms: values.deliveryTerms?.trim() || undefined,
    terms: values.terms?.trim() || undefined,
    globalDiscount: values.globalDiscountPercent.trim() || undefined,
    lineItems: quoteLinesToApi(values.lineItems),
  }
}

export function quoteDetailToApiBody(detail: QuoteDetail): QuoteApiBody {
  return {
    code: detail.code,
    title: detail.title,
    opportunityId: detail.opportunityId || null,
    companyId: detail.companyId ?? null,
    contactId: detail.contactId ?? null,
    amount: detail.amount,
    status: detail.status,
    validUntil: detail.validUntil,
    issueDate: detail.issueDate,
    owner: detail.owner,
    customerKind: detail.customerKind,
    paymentTerms: detail.paymentTerms?.trim() || undefined,
    deliveryTerms: detail.deliveryTerms?.trim() || undefined,
    terms: detail.terms?.trim() || undefined,
    globalDiscount: detail.discountPercent?.trim() || undefined,
    lineItems: quoteLineItemsLocked(detail.status)
      ? undefined
      : quoteLinesToApi(detail.lineItems),
  }
}

export async function listQuotesApi(archived: boolean): Promise<QuoteListItem[]> {
  return fetchAllPages<QuoteListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function listQuotesForOpportunityApi(
  opportunityId: string,
): Promise<QuoteListItem[]> {
  const id = opportunityId.trim()
  if (!id) return []
  return fetchAllPages<QuoteListItem>(BASE, {
    archived: 'false',
    opportunityId: id,
  })
}

export async function getQuoteApi(id: string): Promise<QuoteDetail> {
  const res = await fetchJSON<
    ApiItemResponse<QuoteListItem & { lineItems: QuoteLineItem[] }>
  >(`${BASE}/${id}`)
  return res.data as QuoteDetail
}

export async function createQuoteApi(body: QuoteApiBody): Promise<QuoteListItem> {
  const res = await fetchJSON<ApiItemResponse<QuoteListItem>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateQuoteApi(
  id: string,
  body: Partial<QuoteApiBody>,
): Promise<QuoteDetail> {
  const res = await fetchJSON<
    ApiItemResponse<QuoteListItem & { lineItems: QuoteLineItem[] }>
  >(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data as QuoteDetail
}

export async function archiveQuoteApi(id: string): Promise<QuoteListItem> {
  const res = await fetchJSON<ApiItemResponse<QuoteListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreQuoteApi(id: string): Promise<QuoteListItem> {
  const res = await fetchJSON<ApiItemResponse<QuoteListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function deleteQuoteApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

/** Reserva stock en BD para cotización ya Aceptada (idempotente). */
export async function ensureQuoteStockReservationApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}/reserve-stock`, { method: 'POST' })
}
