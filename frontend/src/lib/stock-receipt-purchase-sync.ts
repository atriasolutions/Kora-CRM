import { getPurchaseDetail } from '@/data/purchase-detail.mock'
import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import type { PurchaseDetail, PurchaseLineItem } from '@/data/purchase-detail.mock'
import { lineItemReceivedQty } from '@/lib/purchase-fulfillment'
import { syncReceivedPercentFromLines } from '@/lib/purchase-fulfillment'
import { normalizeSku } from '@/lib/stock-sku'

function matchPurchaseLine(
  purchaseLines: PurchaseLineItem[],
  receiptLine: StockReceiptLineItem,
): PurchaseLineItem | undefined {
  const skuKey = normalizeSku(receiptLine.sku)
  if (receiptLine.productId) {
    const byProduct = purchaseLines.find((li) => li.productId === receiptLine.productId)
    if (byProduct) return byProduct
  }
  return purchaseLines.find(
    (li) => li.sku && normalizeSku(li.sku) === skuKey,
  )
}

export function applyReceiptLinesToPurchase(
  purchase: PurchaseDetail,
  receiptLines: StockReceiptLineItem[],
): PurchaseDetail {
  const updatedLines = purchase.lineItems.map((li) => ({ ...li }))

  for (const receiptLine of receiptLines) {
    const target = matchPurchaseLine(updatedLines, receiptLine)
    if (!target || !target.sku?.trim()) continue
    const ordered = Math.max(0, target.quantity || 0)
    const prevReceived = lineItemReceivedQty(target)
    const nextReceived = Math.min(ordered, prevReceived + receiptLine.quantity)
    const idx = updatedLines.findIndex((l) => l.id === target.id)
    if (idx >= 0) {
      updatedLines[idx] = { ...updatedLines[idx]!, quantityReceived: nextReceived }
    }
  }

  const receivedPercent = syncReceivedPercentFromLines(
    updatedLines,
    purchase.receivedPercent,
  )

  return {
    ...purchase,
    lineItems: updatedLines,
    receivedPercent,
  }
}

export function syncPurchaseAfterStockReceipt(
  purchaseId: string,
  receiptLines: StockReceiptLineItem[],
): PurchaseDetail | null {
  if (!purchaseId.trim()) return null
  const purchase = getPurchaseDetail(purchaseId)
  return applyReceiptLinesToPurchase(purchase, receiptLines)
}
