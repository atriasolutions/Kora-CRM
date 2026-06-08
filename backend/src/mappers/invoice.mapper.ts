import type {
  InvoiceDetail,
  InvoiceLineItemDto,
  InvoiceListItem,
  InvoicePaymentDto,
} from '../types/invoice.js'
import {
  formatForeignAmount,
  mapDocumentExchangeRates,
} from './currency.mapper.js'
import {
  formatCentsToMoney,
  formatDiscountPct,
} from '../utils/money.js'
import { formatActivityLabel, formatDateLabel, toIsoString } from '../utils/format.js'
import { normalizeProductCurrency } from '../types/currency.js'

export type InvoiceRow = {
  id: string
  number: string
  client_name: string
  customer_kind: string | null
  contact_id: string | null
  contact_name: string
  company_id: string | null
  company_name: string
  quote_id: string | null
  quote_code: string
  amount_cents: string | number
  issue_date: Date | string | null
  due_date: Date | string | null
  status: string
  owner_name: string | null
  payment_method: string | null
  sii_number: string | null
  dte_type: number | null
  sii_track_id: string | null
  dte_status: string | null
  dte_xml: string | null
  sii_emitted_at: Date | string | null
  exchange_rate_date: Date | string | null
  exchange_rate_uf: string | number | null
  exchange_rate_usd: string | number | null
  exchange_rate_eur: string | number | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export type InvoiceLineRow = {
  id: string
  invoice_id: string
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

export type InvoicePaymentRow = {
  id: string
  invoice_id: string
  amount_cents: string | number
  paid_at: Date
  method: string | null
  status: string
  reference: string | null
}

function displayClient(row: InvoiceRow): string {
  if (row.client_name?.trim()) return row.client_name.trim()
  if (row.customer_kind === 'contacto') {
    return row.contact_name?.trim() || 'Contacto sin nombre'
  }
  return row.company_name?.trim() || 'Empresa sin nombre'
}

export function mapInvoiceLineRow(row: InvoiceLineRow): InvoiceLineItemDto {
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

export function mapInvoicePaymentRow(row: InvoicePaymentRow): InvoicePaymentDto {
  const status = row.status as InvoicePaymentDto['status']
  return {
    id: row.id,
    date: formatActivityLabel(row.paid_at),
    amount: formatCentsToMoney(row.amount_cents),
    method: row.method ?? '',
    reference: row.reference ?? '',
    status:
      status === 'Confirmado' || status === 'Pendiente' || status === 'Rechazado'
        ? status
        : 'Confirmado',
  }
}

export function mapInvoiceRow(row: InvoiceRow): InvoiceListItem {
  const amountCents = Number(row.amount_cents ?? 0)
  return {
    id: row.id,
    number: row.number,
    client: displayClient(row),
    customerKind: row.customer_kind ?? undefined,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name || undefined,
    companyId: row.company_id ?? undefined,
    companyName: row.company_name || undefined,
    amount: formatCentsToMoney(amountCents),
    amountNum: Math.round(amountCents / 100),
    issueDate: formatDateLabel(row.issue_date),
    dueDate: formatDateLabel(row.due_date),
    status: row.status,
    owner: row.owner_name ?? '',
    quoteId: row.quote_id ?? undefined,
    paymentMethod: row.payment_method ?? 'Transferencia',
    siiNumber: row.sii_number ?? undefined,
    dteType: row.dte_type ?? undefined,
    siiTrackId: row.sii_track_id ?? undefined,
    dteStatus: (row.dte_status as InvoiceListItem['dteStatus']) ?? undefined,
    siiEmittedAt: row.sii_emitted_at ? toIsoString(row.sii_emitted_at) : undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapInvoiceDetail(
  row: InvoiceRow,
  lineItems: InvoiceLineRow[],
  payments: InvoicePaymentRow[],
): InvoiceDetail {
  const exchange = mapDocumentExchangeRates(row)
  return {
    ...mapInvoiceRow(row),
    quoteCode: row.quote_code || undefined,
    lineItems: lineItems.map(mapInvoiceLineRow),
    payments: payments.map(mapInvoicePaymentRow),
    exchangeRateDate: exchange.exchangeRateDate,
    exchangeRateUf: exchange.exchangeRateUf,
    exchangeRateUsd: exchange.exchangeRateUsd,
    exchangeRateEur: exchange.exchangeRateEur,
  }
}
