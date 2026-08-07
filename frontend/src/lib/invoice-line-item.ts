import type { InvoiceLineItem, InvoiceLineKind } from '@/data/invoice-detail.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
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
import { findLinkedProduct, getAllKnownProducts } from '@/lib/product-lookup'
import { isManualQuoteLine, saleAmountFromProduct } from '@/lib/quote-line-item'

function parseDiscountPercent(discount: string): number {
  const n = Number.parseInt(discount.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

export function invoiceLineKind(line: InvoiceLineItem): InvoiceLineKind {
  if (line.lineKind === 'manual' || line.lineKind === 'product') return line.lineKind
  if (line.productId?.trim()) return 'product'
  return 'manual'
}

export function isManualInvoiceLine(line: InvoiceLineItem): boolean {
  return invoiceLineKind(line) === 'manual'
}

/** Líneas sin campo explícito se tratan como afectas a IVA (compatibilidad con datos guardados). */
export function invoiceLineSubjectToVat(line: InvoiceLineItem): boolean {
  return line.subjectToVat !== false
}

export function invoiceLineCurrency(line: InvoiceLineItem): ProductCurrency {
  return normalizeProductCurrency(line.priceCurrency)
}

function originalAmountFromLine(line: InvoiceLineItem): number {
  const currency = invoiceLineCurrency(line)
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
  line: InvoiceLineItem,
  rates?: ExchangeRateSnapshot | null,
): number {
  const currency = invoiceLineCurrency(line)
  const original = originalAmountFromLine(line)
  if (currency === 'CLP') return original
  if (!rates) return parseMoneyNum(line.unitPrice)
  return convertAmountToClp(original, currency, rates)
}

export function recalcInvoiceLine(
  li: InvoiceLineItem,
  rates?: ExchangeRateSnapshot | null,
): InvoiceLineItem {
  const currency = invoiceLineCurrency(li)
  const original = originalAmountFromLine(li)
  const unitClp = unitPriceClpNum({ ...li, unitPriceOriginalNum: original }, rates)
  // 0 permitido mientras se edita; al blur/guardar se normaliza a ≥ 1.
  const qty = Math.max(0, Math.floor(Number(li.quantity)) || 0)
  const gross = unitClp * qty
  const pct = parseDiscountPercent(li.discount)
  const net = Math.round(gross * (1 - pct / 100))
  const clpDigits = String(li.unitPrice ?? '').replace(/[^\d]/g, '')

  return {
    ...li,
    lineKind: invoiceLineKind(li),
    priceCurrency: currency,
    unitPriceOriginalNum: original,
    unitPriceOriginal:
      currency !== 'CLP' ? formatForeignAmount(original, currency) : undefined,
    quantity: qty,
    unitPrice: currency === 'CLP' && !clpDigits ? '' : formatMoneyCLP(unitClp),
    total: formatMoneyCLP(net),
  }
}

export function recalcInvoiceLinesWithRates(
  items: InvoiceLineItem[],
  rates?: ExchangeRateSnapshot | null,
  options?: { skipWhileLoading?: boolean },
): InvoiceLineItem[] {
  if (options?.skipWhileLoading || !rates) return items
  const hasForeign = items.some((line) => invoiceLineCurrency(line) !== 'CLP')
  if (!hasForeign) return items
  return items.map((line) => recalcInvoiceLine(line, rates))
}

export function defaultInvoiceLineItem(
  id = `inv-li-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  kind: InvoiceLineKind = 'product',
): InvoiceLineItem {
  return recalcInvoiceLine({
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
  })
}

export function invoiceLineFromProduct(
  product: ProductListItem,
  lineId: string,
  rates?: ExchangeRateSnapshot | null,
): InvoiceLineItem {
  const currency = normalizeProductCurrency(product.priceCurrency)
  const saleNum = saleAmountFromProduct(product)
  return recalcInvoiceLine(
    {
      id: lineId,
      lineKind: 'product',
      productId: product.id,
      sku: product.sku,
      description: product.name,
      quantity: 1,
      priceCurrency: currency,
      unitPriceOriginalNum: saleNum,
      unitPrice: '$0',
      discount: '0%',
      total: '$0',
      subjectToVat: true,
    },
    rates,
  )
}

function enrichInvoiceLineFromCatalog(
  line: InvoiceLineItem,
  rates?: ExchangeRateSnapshot | null,
): InvoiceLineItem {
  if (isManualInvoiceLine(line)) return line
  const linked = findLinkedProduct(getAllKnownProducts(), {
    id: line.productId,
    name: line.description,
    sku: line.sku,
  })
  if (!linked) return line
  return recalcInvoiceLine(
    {
      ...line,
      lineKind: 'product',
      productId: linked.id,
      sku: linked.sku,
      description: linked.name,
    },
    rates,
  )
}

export function invoiceLinesFromQuote(quote: QuoteDetail): InvoiceLineItem[] {
  return quote.lineItems.map((li, index) =>
    enrichInvoiceLineFromCatalog(
      recalcInvoiceLine({
        id: `inv-li-q-${quote.id}-${index}`,
        lineKind: isManualQuoteLine(li) ? 'manual' : 'product',
        productId: li.productId,
        sku: li.sku,
        description: li.description,
        quantity: li.quantity,
        priceCurrency: li.priceCurrency,
        unitPriceOriginal: li.unitPriceOriginal,
        unitPriceOriginalNum: li.unitPriceOriginalNum,
        unitPrice: li.unitPrice,
        discount: li.discount,
        total: li.total,
        subjectToVat: li.subjectToVat !== false,
        deferredPayment: li.deferredPayment ?? false,
        deferredPaymentText: li.deferredPaymentText ?? '',
      }),
    ),
  )
}

export type InvoiceTotals = {
  subtotal: string
  taxableSubtotal: string
  exemptSubtotal: string
  discountPercent: string
  discountAmount: string
  taxPercent: string
  taxAmount: string
  amount: string
  amountNum: number
}

export function computeInvoiceTotals(
  lineItems: InvoiceLineItem[],
  options?: { taxPercent?: number; globalDiscountPercent?: string | number },
): InvoiceTotals {
  const taxPct = options?.taxPercent ?? getDefaultVatPercent()
  const globalPct = parseGlobalDiscountPercent(options?.globalDiscountPercent)
  let taxableNum = 0
  let exemptNum = 0

  for (const li of lineItems) {
    const net = parseMoneyNum(li.total)
    if (invoiceLineSubjectToVat(li)) {
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
    amountNum: total,
  }
}
