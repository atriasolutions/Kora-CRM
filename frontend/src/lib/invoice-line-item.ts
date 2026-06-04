import type { InvoiceLineItem, InvoiceLineKind } from '@/data/invoice-detail.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import { getDefaultVatPercent, formatVatPercentLabel } from '@/lib/default-vat'
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

export function recalcInvoiceLine(li: InvoiceLineItem): InvoiceLineItem {
  const unitNum = parseMoneyNum(li.unitPrice)
  const qty = Math.max(1, li.quantity || 1)
  const gross = unitNum * qty
  const pct = parseDiscountPercent(li.discount)
  const net = Math.round(gross * (1 - pct / 100))
  return {
    ...li,
    lineKind: invoiceLineKind(li),
    quantity: qty,
    total: formatMoneyCLP(net),
  }
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
    unitPrice: '$0',
    discount: '0%',
    total: '$0',
    subjectToVat: true,
  })
}

export function invoiceLineFromProduct(
  product: ProductListItem,
  lineId: string,
): InvoiceLineItem {
  const saleNum = saleAmountFromProduct(product)
  return recalcInvoiceLine({
    id: lineId,
    lineKind: 'product',
    productId: product.id,
    sku: product.sku,
    description: product.name,
    quantity: 1,
    unitPrice: formatMoneyCLP(saleNum),
    discount: '0%',
    total: '$0',
    subjectToVat: true,
  })
}

function enrichInvoiceLineFromCatalog(line: InvoiceLineItem): InvoiceLineItem {
  if (isManualInvoiceLine(line)) return line
  const linked = findLinkedProduct(getAllKnownProducts(), {
    id: line.productId,
    name: line.description,
    sku: line.sku,
  })
  if (!linked) return line
  return recalcInvoiceLine({
    ...line,
    lineKind: 'product',
    productId: linked.id,
    sku: linked.sku,
    description: linked.name,
  })
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
        unitPrice: li.unitPrice,
        discount: li.discount,
        total: li.total,
        subjectToVat: true,
      }),
    ),
  )
}

export type InvoiceTotals = {
  subtotal: string
  taxableSubtotal: string
  exemptSubtotal: string
  taxPercent: string
  taxAmount: string
  amount: string
  amountNum: number
}

export function computeInvoiceTotals(
  lineItems: InvoiceLineItem[],
  options?: { taxPercent?: number },
): InvoiceTotals {
  const taxPct = options?.taxPercent ?? getDefaultVatPercent()
  let taxableSubtotalNum = 0
  let exemptSubtotalNum = 0

  for (const li of lineItems) {
    const net = parseMoneyNum(li.total)
    if (invoiceLineSubjectToVat(li)) {
      taxableSubtotalNum += net
    } else {
      exemptSubtotalNum += net
    }
  }

  const subtotalNum = taxableSubtotalNum + exemptSubtotalNum
  const taxAmount = Math.round((taxableSubtotalNum * taxPct) / 100)
  const total = subtotalNum + taxAmount

  return {
    subtotal: formatMoneyCLP(subtotalNum),
    taxableSubtotal: formatMoneyCLP(taxableSubtotalNum),
    exemptSubtotal: formatMoneyCLP(exemptSubtotalNum),
    taxPercent: formatVatPercentLabel(taxPct),
    taxAmount: formatMoneyCLP(taxAmount),
    amount: formatMoneyCLP(total),
    amountNum: total,
  }
}
