import type { PurchaseLineItem } from '@/data/purchase-detail.mock'

export type PurchaseFulfillmentTotals = {
  linesCount: number
  quantityOrdered: number
  quantityReceived: number
  quantityPending: number
  receivedPercent: number
  amountOrdered: number
}

function parseMoney(value: string): number {
  return Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

export function lineItemReceivedQty(line: PurchaseLineItem): number {
  if (line.quantityReceived != null && line.quantityReceived >= 0) {
    return Math.min(line.quantityReceived, line.quantity)
  }
  return 0
}

export function computeFulfillmentTotals(
  lineItems: PurchaseLineItem[],
): PurchaseFulfillmentTotals {
  const quantityOrdered = lineItems.reduce((s, li) => s + (li.quantity || 0), 0)
  const quantityReceived = lineItems.reduce(
    (s, li) => s + lineItemReceivedQty(li),
    0,
  )
  const quantityPending = Math.max(0, quantityOrdered - quantityReceived)
  const receivedPercent =
    quantityOrdered > 0
      ? Math.min(100, Math.round((quantityReceived / quantityOrdered) * 100))
      : 0
  const amountOrdered = lineItems.reduce((s, li) => s + parseMoney(li.total), 0)

  return {
    linesCount: lineItems.length,
    quantityOrdered,
    quantityReceived,
    quantityPending,
    receivedPercent,
    amountOrdered,
  }
}

export function formatMoneyCLP(amount: number): string {
  if (amount <= 0) return '$0'
  return `$${amount.toLocaleString('es-CL')}`
}

export function syncReceivedPercentFromLines(
  lineItems: PurchaseLineItem[],
  fallback = 0,
): number {
  const { receivedPercent, quantityOrdered } = computeFulfillmentTotals(lineItems)
  return quantityOrdered > 0 ? receivedPercent : fallback
}
