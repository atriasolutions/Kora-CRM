import type { QuoteDetail, QuoteLineItemDto, QuoteListItem } from '../types/quote.js'
import {
  formatForeignAmount,
  mapDocumentExchangeRates,
} from './currency.mapper.js'
import {
  formatCentsToMoney,
  formatDiscountPct,
} from '../utils/money.js'
import { formatDateLabel, toIsoString } from '../utils/format.js'
import { normalizeProductCurrency } from '../types/currency.js'

export type QuoteRow = {
  id: string
  code: string
  title: string
  opportunity_id: string | null
  opportunity_name: string
  company_id: string | null
  company_name: string
  contact_id: string | null
  contact_name: string
  amount_cents: string | number
  status: string
  valid_until: Date | string | null
  issue_date: Date | string | null
  owner_name: string | null
  customer_kind: string | null
  payment_terms: string | null
  delivery_terms: string | null
  terms: string | null
  exchange_rate_date: Date | string | null
  exchange_rate_uf: string | number | null
  exchange_rate_usd: string | number | null
  exchange_rate_eur: string | number | null
  global_discount_pct: string | number | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export type QuoteLineRow = {
  id: string
  quote_id: string
  product_id: string | null
  product_name: string
  sku: string
  description: string | null
  quantity: string | number
  unit_price_cents: string | number
  discount_pct: string | number | null
  total_cents: string | number
  sort_order: number
  price_currency: string | null
  unit_price_original: string | number | null
}

export function mapQuoteLineRow(row: QuoteLineRow): QuoteLineItemDto {
  const priceCurrency = normalizeProductCurrency(row.price_currency)
  const originalNum =
    row.unit_price_original != null ? Number(row.unit_price_original) : null

  return {
    id: row.id,
    sku: row.sku,
    productId: row.product_id ?? undefined,
    description: row.description ?? row.product_name,
    quantity: Number(row.quantity),
    unitPrice: formatCentsToMoney(row.unit_price_cents),
    unitPriceOriginal:
      originalNum != null && Number.isFinite(originalNum)
        ? formatForeignAmount(originalNum, priceCurrency)
        : undefined,
    unitPriceOriginalNum:
      originalNum != null && Number.isFinite(originalNum) ? originalNum : undefined,
    priceCurrency: priceCurrency !== 'CLP' ? priceCurrency : undefined,
    discount: formatDiscountPct(row.discount_pct),
    total: formatCentsToMoney(row.total_cents),
  }
}

export function mapQuoteRow(row: QuoteRow): QuoteListItem {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    opportunityId: row.opportunity_id ?? '',
    opportunityName: row.opportunity_name,
    companyName: row.company_name,
    companyId: row.company_id ?? undefined,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name,
    amount: formatCentsToMoney(row.amount_cents),
    status: row.status,
    validUntil: formatDateLabel(row.valid_until),
    issueDate: formatDateLabel(row.issue_date),
    owner: row.owner_name ?? '',
    customerKind: row.customer_kind ?? undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapQuoteDetail(row: QuoteRow, lineItems: QuoteLineRow[]): QuoteDetail {
  const exchange = mapDocumentExchangeRates(row)
  return {
    ...mapQuoteRow(row),
    globalDiscount: formatDiscountPct(row.global_discount_pct),
    lineItems: lineItems.map(mapQuoteLineRow),
    paymentTerms: row.payment_terms?.trim() ?? '',
    deliveryTerms: row.delivery_terms?.trim() ?? '',
    terms: row.terms?.trim() ?? '',
    exchangeRateDate: exchange.exchangeRateDate,
    exchangeRateUf: exchange.exchangeRateUf,
    exchangeRateUsd: exchange.exchangeRateUsd,
    exchangeRateEur: exchange.exchangeRateEur,
  }
}
