import {
  clpAmountToCents,
  convertAmountToClp,
  snapshotFromRates,
} from './currency-conversion.js'
import type { ExchangeRateSnapshot, ProductCurrency } from '../types/currency.js'
import { normalizeProductCurrency } from '../types/currency.js'
import type { PurchaseLineItemInput } from '../types/purchase.js'
import type { QuoteLineItemInput } from '../types/quote.js'
import { parseMoneyToCents, parsePercentToInt } from '../utils/money.js'
import type { ComputedLine, ComputedPurchaseLine } from './line-items.js'
import {
  computePurchaseLines,
  computeQuoteLines,
  lineTotalCents,
} from './line-items.js'

export type ProductPriceInfo = {
  currency: ProductCurrency
  amount: number
}

export type ComputedLineWithCurrency = ComputedLine & {
  priceCurrency: ProductCurrency
  unitPriceOriginal: number
  subjectToVat: boolean
  deferredPayment: boolean
  deferredPaymentText: string | null
}

function resolveDocumentLineExtras(item: {
  subjectToVat?: boolean
  deferredPayment?: boolean
  deferredPaymentText?: string
}): Pick<
  ComputedLineWithCurrency,
  'subjectToVat' | 'deferredPayment' | 'deferredPaymentText'
> {
  const deferredPayment = item.deferredPayment === true
  return {
    subjectToVat: item.subjectToVat !== false,
    deferredPayment,
    deferredPaymentText: deferredPayment
      ? item.deferredPaymentText?.trim() || null
      : null,
  }
}

export type ComputedPurchaseLineWithCurrency = ComputedPurchaseLine & {
  priceCurrency: ProductCurrency
  unitPriceOriginal: number
}

export type DocumentCurrencyResult<T> = {
  lines: T[]
  exchangeRates: ReturnType<typeof snapshotFromRates>
}

function parseOriginalAmount(
  item: { unitPrice?: string; unitPriceOriginal?: number | string },
  currency: ProductCurrency,
): number {
  if (item.unitPriceOriginal != null && item.unitPriceOriginal !== '') {
    const n = Number(item.unitPriceOriginal)
    if (Number.isFinite(n) && n > 0) return n
  }
  if (currency === 'CLP' && item.unitPrice?.trim()) {
    const fromMoney = parseMoneyToCents(item.unitPrice) / 100
    if (Number.isFinite(fromMoney) && fromMoney > 0) return fromMoney
  }
  return 0
}

function resolveLineCurrency(
  item: { priceCurrency?: string; productId?: string | null },
  productPrices: Map<string, ProductPriceInfo>,
): ProductCurrency {
  if (item.priceCurrency?.trim()) {
    return normalizeProductCurrency(item.priceCurrency)
  }
  const productId = item.productId?.trim()
  if (productId && productPrices.has(productId)) {
    return productPrices.get(productId)!.currency
  }
  return 'CLP'
}

function resolveOriginalAmount(
  item: { unitPrice?: string; unitPriceOriginal?: number | string; productId?: string | null },
  currency: ProductCurrency,
  productPrices: Map<string, ProductPriceInfo>,
): number {
  const explicit = parseOriginalAmount(item, currency)
  if (explicit > 0) return explicit

  const productId = item.productId?.trim()
  if (productId && productPrices.has(productId)) {
    const product = productPrices.get(productId)!
    if (product.currency === currency && product.amount > 0) {
      return product.amount
    }
  }

  return 0
}

function unitPriceCentsFromCurrency(
  originalAmount: number,
  currency: ProductCurrency,
  rates: ExchangeRateSnapshot,
): number {
  if (currency === 'CLP') {
    return parseMoneyToCents(String(originalAmount)) || clpAmountToCents(originalAmount)
  }
  const clp = convertAmountToClp(originalAmount, currency, rates)
  return clpAmountToCents(clp)
}

export function computeQuoteLinesWithCurrency(
  items: QuoteLineItemInput[] | undefined,
  rates: ExchangeRateSnapshot,
  productPrices: Map<string, ProductPriceInfo>,
): DocumentCurrencyResult<ComputedLineWithCurrency> {
  if (!items?.length) {
    return { lines: [], exchangeRates: snapshotFromRates(rates, []) }
  }

  const usedCurrencies = new Set<ProductCurrency>()
  const lines = items.map((item) => {
    const quantity = item.quantity ?? 1
    const discountPct = parsePercentToInt(item.discount) ?? 0
    const productName = item.productName?.trim() || item.description?.trim() || 'Ítem'
    const priceCurrency = resolveLineCurrency(item, productPrices)
    const unitPriceOriginal = resolveOriginalAmount(item, priceCurrency, productPrices)
    if (priceCurrency !== 'CLP') usedCurrencies.add(priceCurrency)

    const unitPriceCents = unitPriceCentsFromCurrency(
      unitPriceOriginal,
      priceCurrency,
      rates,
    )

    return {
      productName,
      description: item.description?.trim() || null,
      quantity,
      unitPriceCents,
      discountPct,
      totalCents: lineTotalCents(quantity, unitPriceCents, discountPct),
      productId: item.productId ?? null,
      sku: item.sku?.trim() || '',
      priceCurrency,
      unitPriceOriginal,
      ...resolveDocumentLineExtras(item),
    }
  })

  return {
    lines,
    exchangeRates: snapshotFromRates(rates, usedCurrencies),
  }
}

export function computePurchaseLinesWithCurrency(
  items: PurchaseLineItemInput[] | undefined,
  rates: ExchangeRateSnapshot,
  productPrices: Map<string, ProductPriceInfo>,
): DocumentCurrencyResult<ComputedPurchaseLineWithCurrency> {
  if (!items?.length) {
    return { lines: [], exchangeRates: snapshotFromRates(rates, []) }
  }

  const usedCurrencies = new Set<ProductCurrency>()
  const lines = items.map((item) => {
    const quantity = item.quantity ?? 1
    const productName = item.product?.trim() || item.description?.trim() || 'Ítem'
    const priceCurrency = resolveLineCurrency(item, productPrices)
    const unitPriceOriginal = resolveOriginalAmount(item, priceCurrency, productPrices)
    if (priceCurrency !== 'CLP') usedCurrencies.add(priceCurrency)

    const unitPriceCents = unitPriceCentsFromCurrency(
      unitPriceOriginal,
      priceCurrency,
      rates,
    )
    const discountPct = parsePercentToInt(item.discount) ?? 0
    const quantityReceived = Math.min(
      Math.max(0, item.quantityReceived ?? 0),
      quantity,
    )

    return {
      productName,
      description: item.description?.trim() || null,
      quantity,
      quantityReceived,
      unitPriceCents,
      discountPct,
      totalCents: lineTotalCents(quantity, unitPriceCents, discountPct),
      productId: item.productId ?? null,
      sku: item.sku?.trim() || '',
      priceCurrency,
      unitPriceOriginal,
    }
  })

  return {
    lines,
    exchangeRates: snapshotFromRates(rates, usedCurrencies),
  }
}

/** Fallback sin conversión (líneas ya en CLP). */
export function computeQuoteLinesPlain(
  items: QuoteLineItemInput[] | undefined,
): ComputedLine[] {
  return computeQuoteLines(items)
}

export function computePurchaseLinesPlain(
  items: PurchaseLineItemInput[] | undefined,
): ComputedPurchaseLine[] {
  return computePurchaseLines(items)
}

export async function loadProductPricesByIds(
  productIds: string[],
): Promise<Map<string, ProductPriceInfo>> {
  const { pool } = await import('../db/pool.js')
  const ids = [...new Set(productIds.filter(Boolean))]
  const map = new Map<string, ProductPriceInfo>()
  if (ids.length === 0) return map

  const result = await pool.query<{
    id: string
    price_currency: string | null
    price_amount: string | number | null
    price_cents: string | number
  }>(
    `SELECT id, price_currency, price_amount, price_cents
     FROM crm_products
     WHERE id = ANY($1::uuid[])`,
    [ids],
  )

  for (const row of result.rows) {
    const currency = normalizeProductCurrency(row.price_currency)
    const amount =
      row.price_amount != null
        ? Number(row.price_amount)
        : Number(row.price_cents) / 100
    map.set(row.id, { currency, amount: Number.isFinite(amount) ? amount : 0 })
  }

  return map
}

export async function loadQuoteExchangeRates(
  quoteId: string,
): Promise<ExchangeRateSnapshot | null> {
  const { pool } = await import('../db/pool.js')
  const result = await pool.query<{
    exchange_rate_date: Date | string | null
    exchange_rate_uf: string | number | null
    exchange_rate_usd: string | number | null
    exchange_rate_eur: string | number | null
  }>(
    `SELECT exchange_rate_date, exchange_rate_uf, exchange_rate_usd, exchange_rate_eur
     FROM crm_quotes
     WHERE id = $1 AND deleted_at IS NULL`,
    [quoteId],
  )
  const row = result.rows[0]
  if (!row?.exchange_rate_date) return null

  return {
    rateDate:
      row.exchange_rate_date instanceof Date
        ? row.exchange_rate_date.toISOString().slice(0, 10)
        : String(row.exchange_rate_date).slice(0, 10),
    ufClp: Number(row.exchange_rate_uf ?? 0),
    usdClp: Number(row.exchange_rate_usd ?? 0),
    eurClp: Number(row.exchange_rate_eur ?? 0),
  }
}

export function collectProductIdsFromQuoteItems(
  items: QuoteLineItemInput[] | undefined,
): string[] {
  return (items ?? [])
    .map((item) => item.productId?.trim())
    .filter((id): id is string => Boolean(id))
}

export function collectProductIdsFromPurchaseItems(
  items: PurchaseLineItemInput[] | undefined,
): string[] {
  return (items ?? [])
    .map((item) => item.productId?.trim())
    .filter((id): id is string => Boolean(id))
}
