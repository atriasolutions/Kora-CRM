import type { OpportunityLineItemInput } from '../types/opportunity.js'
import type { PurchaseLineItemInput } from '../types/purchase.js'
import type { QuoteLineItemInput } from '../types/quote.js'
import type { StockReceiptLineItemInput } from '../types/stock-receipt.js'
import { parseMoneyToCents, parsePercentToInt } from '../utils/money.js'

export type ComputedLine = {
  productName: string
  description: string | null
  quantity: number
  unitPriceCents: number
  discountPct: number
  totalCents: number
  productId?: string | null
  sku?: string
}

export function lineTotalCents(
  quantity: number,
  unitPriceCents: number,
  discountPct: number,
): number {
  const sub = quantity * unitPriceCents
  return Math.round(sub * (1 - discountPct / 100))
}

export function computeOpportunityLines(
  items: OpportunityLineItemInput[] | undefined,
): ComputedLine[] {
  if (!items?.length) return []
  return items.map((item) => {
    const quantity = item.quantity ?? 1
    const unitPriceCents = parseMoneyToCents(item.unitPrice)
    const discountPct = parsePercentToInt(item.discount) ?? 0
    const productName = item.product?.trim() || item.description?.trim() || 'Ítem'
    return {
      productName,
      description: item.description?.trim() || null,
      quantity,
      unitPriceCents,
      discountPct,
      totalCents: lineTotalCents(quantity, unitPriceCents, discountPct),
    }
  })
}

export function computeQuoteLines(
  items: QuoteLineItemInput[] | undefined,
): ComputedLine[] {
  if (!items?.length) return []
  return items.map((item) => {
    const quantity = item.quantity ?? 1
    const unitPriceCents = parseMoneyToCents(item.unitPrice)
    const discountPct = parsePercentToInt(item.discount) ?? 0
    const productName = item.productName?.trim() || item.description?.trim() || 'Ítem'
    return {
      productName,
      description: item.description?.trim() || null,
      quantity,
      unitPriceCents,
      discountPct,
      totalCents: lineTotalCents(quantity, unitPriceCents, discountPct),
      productId: item.productId ?? null,
      sku: item.sku?.trim() || '',
    }
  })
}

export function sumLineTotals(lines: ComputedLine[]): number {
  return lines.reduce((acc, l) => acc + l.totalCents, 0)
}

export type ComputedPurchaseLine = ComputedLine & {
  productId?: string | null
  sku: string
  quantityReceived: number
}

export function computePurchaseLines(
  items: PurchaseLineItemInput[] | undefined,
): ComputedPurchaseLine[] {
  if (!items?.length) return []
  return items.map((item) => {
    const quantity = item.quantity ?? 1
    const unitPriceCents = parseMoneyToCents(item.unitPrice)
    const discountPct = parsePercentToInt(item.discount) ?? 0
    const productName = item.product?.trim() || item.description?.trim() || 'Ítem'
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
    }
  })
}

export type ComputedStockReceiptLine = {
  productName: string
  quantity: number
  productId?: string | null
  sku: string
}

export function computeStockReceiptLines(
  items: StockReceiptLineItemInput[] | undefined,
): ComputedStockReceiptLine[] {
  if (!items?.length) return []
  return items
    .filter((item) => item.sku?.trim())
    .map((item) => ({
      productName: item.product?.trim() || item.sku?.trim() || 'Ítem',
      quantity: Math.max(0, item.quantity ?? 0),
      productId: item.productId ?? null,
      sku: item.sku?.trim() || '',
    }))
}
