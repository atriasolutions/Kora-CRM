import type {
  PurchaseDetail,
  PurchaseLineItem,
  PurchaseListItem,
} from '../types/purchase.js'
import {
  formatForeignAmount,
  mapDocumentExchangeRates,
} from './currency.mapper.js'
import { formatActivityLabel, formatDateLabel, toIsoString } from '../utils/format.js'
import { formatCentsToMoney, formatDiscountPct } from '../utils/money.js'
import { normalizeProductCurrency } from '../types/currency.js'

export type PurchaseRow = {
  id: string
  reference: string
  supplier_id: string | null
  supplier_name: string
  product_summary: string | null
  order_date: Date | string | null
  amount_cents: string | number
  status: PurchaseListItem['status']
  description: string | null
  expected_delivery: Date | string | null
  payment_terms: string | null
  warehouse_id: string | null
  warehouse_name: string | null
  delivery_address: string | null
  supplier_contact_id: string | null
  supplier_contact_name: string | null
  supplier_email: string | null
  supplier_phone: string | null
  owner_name: string | null
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

export type PurchaseLineRow = {
  id: string
  purchase_id: string
  product_id: string | null
  product_name: string
  sku: string
  description: string | null
  quantity: string | number
  quantity_received: string | number
  unit_price_cents: string | number
  discount_pct: string | number | null
  total_cents: string | number
  sort_order: number
  price_currency: string | null
  unit_price_original: string | number | null
}

export function mapPurchaseRow(row: PurchaseRow): PurchaseListItem {
  const amountCents = Number(row.amount_cents ?? 0)
  return {
    id: row.id,
    reference: row.reference,
    supplier: row.supplier_name,
    supplierId: row.supplier_id ?? undefined,
    productSummary: row.product_summary ?? '',
    orderDate: formatDateLabel(row.order_date),
    amount: formatCentsToMoney(amountCents),
    amountNum: Math.round(amountCents / 100),
    status: row.status,
    owner: row.owner_name ?? '',
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapPurchaseLineRow(row: PurchaseLineRow): PurchaseLineItem {
  const quantity = Number(row.quantity ?? 0)
  const priceCurrency = normalizeProductCurrency(row.price_currency)
  const originalNum =
    row.unit_price_original != null ? Number(row.unit_price_original) : null

  return {
    id: row.id,
    productId: row.product_id ?? undefined,
    product: row.product_name,
    description: row.description ?? undefined,
    sku: row.sku || undefined,
    quantity,
    quantityReceived: Number(row.quantity_received ?? 0),
    unitPrice: formatCentsToMoney(row.unit_price_cents),
    unitPriceOriginal:
      originalNum != null && Number.isFinite(originalNum)
        ? formatForeignAmount(originalNum, priceCurrency)
        : undefined,
    priceCurrency: priceCurrency !== 'CLP' ? priceCurrency : undefined,
    discount: formatDiscountPct(row.discount_pct),
    total: formatCentsToMoney(row.total_cents),
  }
}

function mapPurchaseDetailFields(row: PurchaseRow) {
  return {
    description: row.description?.trim() ?? '',
    expectedDelivery: formatDateLabel(row.expected_delivery),
    paymentTerms: row.payment_terms?.trim() ?? '',
    warehouseId: row.warehouse_id ?? undefined,
    warehouse: row.warehouse_name?.trim() ?? '',
    deliveryAddress: row.delivery_address?.trim() ?? '',
    supplierContactId: row.supplier_contact_id ?? undefined,
    supplierContact: row.supplier_contact_name?.trim() ?? '',
    supplierEmail: row.supplier_email?.trim() ?? '',
    supplierPhone: row.supplier_phone?.trim() ?? '',
  }
}

export function mapPurchaseDetail(
  row: PurchaseRow,
  lines: PurchaseLineRow[],
): PurchaseDetail {
  const exchange = mapDocumentExchangeRates(row)
  return {
    ...mapPurchaseRow(row),
    ...mapPurchaseDetailFields(row),
    lineItems: lines.map(mapPurchaseLineRow),
    exchangeRateDate: exchange.exchangeRateDate,
    exchangeRateUf: exchange.exchangeRateUf,
    exchangeRateUsd: exchange.exchangeRateUsd,
    exchangeRateEur: exchange.exchangeRateEur,
  }
}

export function formatInventoryLastMovement(at: Date | string | null): string {
  if (!at) return '—'
  return formatActivityLabel(at)
}
