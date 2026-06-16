import type { QuoteLineItem, QuoteLineKind } from '@/data/quote-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import {
  convertAmountToClp,
  formatForeignAmount,
  normalizeProductCurrency,
  type ExchangeRateSnapshot,
  type ProductCurrency,
} from '@/lib/currency'
import { getDefaultVatPercent, formatVatPercentLabel } from '@/lib/default-vat'
import {
  formatGlobalDiscountPercent,
  parseGlobalDiscountPercent,
} from '@/lib/document-global-discount'
import { parseProductPrice } from '@/lib/product-currency-input'
import { formatMoneyCLP, parseMoneyNum } from '@/lib/product-pricing'

function parseDiscountPercent(discount: string): number {
  const n = Number.parseInt(discount.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

export function quoteLineKind(line: QuoteLineItem): QuoteLineKind {
  if (line.lineKind === 'manual' || line.lineKind === 'product') return line.lineKind
  if (line.productId?.trim()) return 'product'
  return 'manual'
}

export function isManualQuoteLine(line: QuoteLineItem): boolean {
  return quoteLineKind(line) === 'manual'
}

export function quoteLineSubjectToVat(line: QuoteLineItem): boolean {
  return line.subjectToVat !== false
}

export function quoteLineDescription(line: QuoteLineItem): string {
  return line.description.trim()
}

export function quoteLineCurrency(line: QuoteLineItem): ProductCurrency {
  return normalizeProductCurrency(line.priceCurrency)
}

export function saleAmountFromProduct(product: ProductListItem): number {
  const currency = normalizeProductCurrency(product.priceCurrency)
  if (product.priceNum > 0 && Number.isFinite(product.priceNum)) {
    return product.priceNum
  }
  return parseProductPrice(product.price, currency)
}

function originalAmountFromLine(line: QuoteLineItem): number {
  const currency = quoteLineCurrency(line)
  if (line.unitPriceOriginalNum != null && Number.isFinite(line.unitPriceOriginalNum)) {
    return line.unitPriceOriginalNum
  }
  if (line.unitPriceOriginal?.trim()) {
    return parseProductPrice(line.unitPriceOriginal, currency)
  }
  if (currency === 'CLP') return parseMoneyNum(line.unitPrice)
  return parseProductPrice(line.unitPrice, currency)
}

function unitPriceClpNum(
  line: QuoteLineItem,
  rates?: ExchangeRateSnapshot | null,
): number {
  const currency = quoteLineCurrency(line)
  const original = originalAmountFromLine(line)
  if (currency === 'CLP') return original
  if (!rates) return parseMoneyNum(line.unitPrice)
  return convertAmountToClp(original, currency, rates)
}

export function recalcQuoteLine(
  li: QuoteLineItem,
  rates?: ExchangeRateSnapshot | null,
): QuoteLineItem {
  const currency = quoteLineCurrency(li)
  const original = originalAmountFromLine(li)
  const unitClp = unitPriceClpNum({ ...li, unitPriceOriginalNum: original }, rates)
  const qty = Math.max(1, li.quantity || 1)
  const gross = unitClp * qty
  const pct = parseDiscountPercent(li.discount)
  const net = Math.round(gross * (1 - pct / 100))

  return {
    ...li,
    lineKind: quoteLineKind(li),
    priceCurrency: currency,
    unitPriceOriginalNum: original,
    unitPriceOriginal:
      currency !== 'CLP' ? formatForeignAmount(original, currency) : undefined,
    quantity: qty,
    unitPrice: formatMoneyCLP(unitClp),
    total: formatMoneyCLP(net),
  }
}

export function defaultQuoteLineItem(
  id = `qli-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  kind: QuoteLineKind = 'product',
): QuoteLineItem {
  return recalcQuoteLine({
    id,
    lineKind: kind,
    sku: '',
    productId: kind === 'product' ? '' : undefined,
    description: '',
    quantity: 1,
    priceCurrency: 'CLP',
    unitPriceOriginalNum: 0,
    unitPrice: '$0',
    discount: '0%',
    total: '$0',
    subjectToVat: true,
    deferredPayment: false,
    deferredPaymentText: '',
  })
}

export function quoteLineFromProduct(
  product: ProductListItem,
  lineId: string,
  rates?: ExchangeRateSnapshot | null,
): QuoteLineItem {
  const currency = normalizeProductCurrency(product.priceCurrency)
  const saleNum = saleAmountFromProduct(product)
  return recalcQuoteLine(
    {
      id: lineId,
      lineKind: 'product',
      sku: product.sku,
      productId: product.id,
      description: product.name,
      quantity: 1,
      priceCurrency: currency,
      unitPriceOriginalNum: saleNum,
      unitPrice: '$0',
      discount: '0%',
      total: '$0',
    },
    rates,
  )
}

export type QuoteTotals = {
  subtotal: string
  taxableSubtotal: string
  exemptSubtotal: string
  discountPercent: string
  discountAmount: string
  taxPercent: string
  taxAmount: string
  amount: string
}

export function validateQuoteLineItems(lineItems: QuoteLineItem[]): string | null {
  for (let i = 0; i < lineItems.length; i += 1) {
    const li = lineItems[i]!
    if (li.deferredPayment === true && !li.deferredPaymentText?.trim()) {
      return `Indica el texto de plazo entrega en la línea ${i + 1}.`
    }
  }
  return null
}

export function computeQuoteTotals(
  lineItems: QuoteLineItem[],
  options?: { taxPercent?: number; globalDiscountPercent?: string | number },
): QuoteTotals {
  const taxPct = options?.taxPercent ?? getDefaultVatPercent()
  const globalPct = parseGlobalDiscountPercent(options?.globalDiscountPercent)
  let taxableNum = 0
  let exemptNum = 0

  for (const li of lineItems) {
    const net = parseMoneyNum(li.total)
    if (quoteLineSubjectToVat(li)) {
      taxableNum += net
    } else {
      exemptNum += net
    }
  }

  const linesSubtotalNum = taxableNum + exemptNum
  const discountAmountNum = Math.round((linesSubtotalNum * globalPct) / 100)

  let taxableAfter = taxableNum
  let exemptAfter = exemptNum
  if (linesSubtotalNum > 0 && discountAmountNum > 0) {
    const taxableDiscount = Math.round((discountAmountNum * taxableNum) / linesSubtotalNum)
    const exemptDiscount = discountAmountNum - taxableDiscount
    taxableAfter = taxableNum - taxableDiscount
    exemptAfter = exemptNum - exemptDiscount
  }

  const netSubtotalNum = taxableAfter + exemptAfter
  const taxAmount = Math.round((taxableAfter * taxPct) / 100)
  const total = netSubtotalNum + taxAmount

  return {
    subtotal: formatMoneyCLP(linesSubtotalNum),
    taxableSubtotal: formatMoneyCLP(taxableAfter),
    exemptSubtotal: formatMoneyCLP(exemptAfter),
    discountPercent: formatGlobalDiscountPercent(globalPct),
    discountAmount:
      discountAmountNum > 0 ? `−${formatMoneyCLP(discountAmountNum)}` : '$0',
    taxPercent: formatVatPercentLabel(taxPct),
    taxAmount: formatMoneyCLP(taxAmount),
    amount: formatMoneyCLP(total),
  }
}
