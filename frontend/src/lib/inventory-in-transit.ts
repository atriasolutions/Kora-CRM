import { isApiEnabled } from '@/api/config'
import { getPurchaseDetail } from '@/data/purchase-detail.mock'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import { getPurchaseLinesSync } from '@/lib/purchase-lines'
import {
  getAllRegistryPurchases,
} from '@/data/purchases-registry-store'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { isCatalogStockLine } from '@/lib/purchase-line-item'
import { isPurchaseOpenForStock } from '@/lib/purchase-journey'
import {
  inTransitQtyForPurchaseLine,
  purchaseHasWarehouseInboundPending,
} from '@/lib/purchase-inbound-stock'
import { formatQuantityLabel } from '@/lib/stock-service'
import type { InventoryListItem } from '@/data/inventory.mock'
import { normalizeSku } from '@/lib/stock-sku'

export type InTransitPurchaseLine = {
  purchaseId: string
  reference: string
  supplier: string
  sku: string
  productName: string
  pendingQty: number
  orderedQty: number
  receivedQty: number
}

/** @deprecated use isCatalogStockLine */
export function isStockPurchaseLine(line: PurchaseLineItem): boolean {
  return isCatalogStockLine(line)
}

export function isPurchaseOpenForInTransit(status: PurchaseListItem['status']): boolean {
  return isPurchaseOpenForStock(status)
}

function pendingQtyForLine(purchaseId: string, line: PurchaseLineItem): number {
  return inTransitQtyForPurchaseLine(purchaseId, line)
}

function lineItemsForPurchase(purchaseId: string): PurchaseLineItem[] {
  if (isApiEnabled()) {
    return getPurchaseLinesSync(purchaseId)
  }
  return getPurchaseDetail(purchaseId).lineItems
}

export function inTransitLinesFromPurchases(
  purchases: PurchaseListItem[] = getAllRegistryPurchases(),
): InTransitPurchaseLine[] {
  const lines: InTransitPurchaseLine[] = []

  for (const purchase of purchases) {
    if (!isPurchaseOpenForInTransit(purchase.status)) continue

    const purchaseLines = lineItemsForPurchase(purchase.id)
    if (!purchaseHasWarehouseInboundPending(purchase.id, purchaseLines)) continue

    for (const line of purchaseLines) {
      if (!isCatalogStockLine(line)) continue
      const pending = pendingQtyForLine(purchase.id, line)
      if (pending <= 0) continue

      const ordered = Math.max(0, line.quantity || 0)
      const ingressed = ordered - pending

      lines.push({
        purchaseId: purchase.id,
        reference: purchase.reference,
        supplier: purchase.supplier,
        sku: line.sku!.trim(),
        productName: line.product,
        pendingQty: pending,
        orderedQty: line.quantity,
        receivedQty: ingressed,
      })
    }
  }

  return lines
}

export function buildInTransitQtyBySku(
  purchases?: PurchaseListItem[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const line of inTransitLinesFromPurchases(purchases)) {
    const key = normalizeSku(line.sku)
    map.set(key, (map.get(key) ?? 0) + line.pendingQty)
  }
  return map
}

export function inTransitQtyForSku(
  sku: string,
  purchases?: PurchaseListItem[],
): number {
  const key = normalizeSku(sku)
  return buildInTransitQtyBySku(purchases).get(key) ?? 0
}

export function inTransitLinesForSku(
  sku: string,
  purchases?: PurchaseListItem[],
): InTransitPurchaseLine[] {
  const key = normalizeSku(sku)
  return inTransitLinesFromPurchases(purchases).filter(
    (line) => normalizeSku(line.sku) === key,
  )
}

export function formatInTransitLabel(
  qty: number,
  unitTemplate: Pick<InventoryListItem, 'quantity'>,
): string {
  if (qty <= 0) return '0'
  return formatQuantityLabel(qty, unitTemplate)
}
