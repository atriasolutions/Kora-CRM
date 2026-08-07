import type {
  BoletaDetail,
  BoletaLineItemDto,
  BoletaListItem,
} from '../types/boleta.js'
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

export type BoletaRow = {
  id: string
  number: string
  buyer_name: string
  buyer_tax_id: string | null
  contact_id: string | null
  contact_name: string
  company_id: string | null
  company_name: string
  amount_cents: string | number
  issue_date: Date | string | null
  status: string
  owner_name: string | null
  payment_method: string | null
  taxable_amount_cents: string | number | null
  exempt_amount_cents: string | number | null
  tax_amount_cents: string | number | null
  global_discount_pct: string | number | null
  notes: string | null
  printed_at: Date | string | null
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

export type BoletaLineRow = {
  id: string
  boleta_id: string
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
  subject_to_vat: boolean | null
  deferred_payment: boolean | null
  deferred_payment_text: string | null
}

function displayBuyer(row: BoletaRow): string {
  if (row.buyer_name?.trim()) return row.buyer_name.trim()
  if (row.contact_name?.trim()) return row.contact_name.trim()
  return row.company_name?.trim() || 'Sin comprador'
}

export function mapBoletaLineRow(row: BoletaLineRow): BoletaLineItemDto {
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
    subjectToVat: row.subject_to_vat !== false,
    deferredPayment: row.deferred_payment === true,
    deferredPaymentText: row.deferred_payment_text ?? undefined,
  }
}

export function mapBoletaRow(row: BoletaRow): BoletaListItem {
  const amountCents = Number(row.amount_cents)
  return {
    id: row.id,
    number: row.number,
    buyerName: displayBuyer(row),
    buyerTaxId: row.buyer_tax_id?.trim() || undefined,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name?.trim() || undefined,
    companyId: row.company_id ?? undefined,
    companyName: row.company_name?.trim() || undefined,
    amount: formatCentsToMoney(amountCents),
    amountNum: amountCents / 100,
    issueDate: formatDateLabel(row.issue_date),
    status: row.status,
    owner: row.owner_name?.trim() || '—',
    paymentMethod: row.payment_method?.trim() || '—',
    taxableAmount:
      row.taxable_amount_cents != null
        ? formatCentsToMoney(row.taxable_amount_cents)
        : undefined,
    exemptAmount:
      row.exempt_amount_cents != null
        ? formatCentsToMoney(row.exempt_amount_cents)
        : undefined,
    taxAmount:
      row.tax_amount_cents != null
        ? formatCentsToMoney(row.tax_amount_cents)
        : undefined,
    notes: row.notes?.trim() || undefined,
    printedAt: row.printed_at ? toIsoString(row.printed_at) : undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name?.trim() || '—',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name?.trim() || '—',
  }
}

export function mapBoletaDetail(
  row: BoletaRow,
  lineItems: BoletaLineItemDto[],
): BoletaDetail {
  const base = mapBoletaRow(row)
  const globalDiscountPct = Number(row.global_discount_pct ?? 0)
  return {
    ...base,
    globalDiscount:
      globalDiscountPct > 0 ? `${globalDiscountPct}%` : undefined,
    lineItems,
    ...mapDocumentExchangeRates(row),
  }
}
