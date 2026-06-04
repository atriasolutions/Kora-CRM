import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import { stockReceiptsForPurchase } from '@/data/stock-receipt-detail.mock'
import { getRegistryStockReceiptLines } from '@/data/stock-receipt-lines-registry-store'
import { isCatalogStockLine, recalcPurchaseLine } from '@/lib/purchase-line-item'
import { loadStockReceiptDetailOverride } from '@/lib/stock-receipt-detail-storage'
import { normalizeSku } from '@/lib/stock-sku'

type IngresoQtyOptions = {
  /** Al editar un ingreso borrador, no contar sus líneas en lo ya reservado. */
  excludeReceiptId?: string
}

function receiptLines(receiptId: string): StockReceiptLineItem[] {
  return (
    getRegistryStockReceiptLines(receiptId) ??
    loadStockReceiptDetailOverride(receiptId)?.lineItems ??
    []
  )
}

function isReservedReceiptStatus(status: string): boolean {
  return status === 'Confirmado' || status === 'Borrador'
}

/** Cantidades en ingresos confirmados por SKU (stock ya en bodega). */
export function confirmedIngresoQtyBySkuForPurchase(
  purchaseId: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const receipt of stockReceiptsForPurchase(purchaseId)) {
    if (receipt.status !== 'Confirmado') continue
    for (const line of receiptLines(receipt.id)) {
      const sku = line.sku?.trim()
      if (!sku) continue
      const key = normalizeSku(sku)
      map.set(key, (map.get(key) ?? 0) + Math.max(0, line.quantity))
    }
  }
  return map
}

/** Cantidades reservadas en borradores + confirmados (evita duplicar al crear otro ingreso). */
export function reservedIngresoQtyBySkuForPurchase(
  purchaseId: string,
  options?: IngresoQtyOptions,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const receipt of stockReceiptsForPurchase(purchaseId)) {
    if (options?.excludeReceiptId && receipt.id === options.excludeReceiptId) continue
    if (!isReservedReceiptStatus(receipt.status)) continue
    for (const line of receiptLines(receipt.id)) {
      const sku = line.sku?.trim()
      if (!sku) continue
      const key = normalizeSku(sku)
      map.set(key, (map.get(key) ?? 0) + Math.max(0, line.quantity))
    }
  }
  return map
}

export function orderedCatalogQtyBySku(
  lineItems: PurchaseLineItem[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const line of lineItems) {
    if (!isCatalogStockLine(line)) continue
    const sku = line.sku?.trim()
    if (!sku) continue
    const key = normalizeSku(sku)
    map.set(key, (map.get(key) ?? 0) + Math.max(0, line.quantity || 0))
  }
  return map
}

/** Unidades por SKU que aún pueden ingresarse (OC − borradores/confirmados). */
export function pendingQtyBySkuForPurchase(
  purchaseId: string,
  lineItems: PurchaseLineItem[],
  options?: IngresoQtyOptions,
): Map<string, number> {
  const ordered = orderedCatalogQtyBySku(lineItems)
  const reserved = reservedIngresoQtyBySkuForPurchase(purchaseId, options)
  const pending = new Map<string, number>()
  for (const [sku, qty] of ordered) {
    pending.set(sku, Math.max(0, qty - (reserved.get(sku) ?? 0)))
  }
  return pending
}

/** Unidades de la línea OC que aún no tienen ingreso confirmado en bodega. */
export function pendingWarehouseQtyForPurchaseLine(
  purchaseId: string,
  line: PurchaseLineItem,
): number {
  if (!isCatalogStockLine(line)) return 0
  const sku = line.sku?.trim()
  if (!sku) return 0
  const key = normalizeSku(sku)
  const ordered = Math.max(0, line.quantity || 0)
  const ingressed =
    confirmedIngresoQtyBySkuForPurchase(purchaseId).get(key) ?? 0
  return Math.max(0, ordered - ingressed)
}

/** Igual que {@link pendingWarehouseQtyForPurchaseLine}: fuente única para «en tránsito». */
export function inTransitQtyForPurchaseLine(
  purchaseId: string,
  line: PurchaseLineItem,
): number {
  return pendingWarehouseQtyForPurchaseLine(purchaseId, line)
}

/** True si alguna línea de catálogo aún espera ingreso confirmado. */
export function purchaseHasWarehouseInboundPending(
  purchaseId: string,
  lineItems: PurchaseLineItem[],
): boolean {
  return lineItems.some(
    (line) => inTransitQtyForPurchaseLine(purchaseId, line) > 0,
  )
}

/** Alinea `quantityReceived` con ingresos confirmados (evita desfase con inventario). */
export function syncPurchaseLinesReceivedFromIngresos(
  purchaseId: string,
  lineItems: PurchaseLineItem[],
): PurchaseLineItem[] {
  const confirmed = confirmedIngresoQtyBySkuForPurchase(purchaseId)
  return lineItems.map((line) => {
    if (!isCatalogStockLine(line)) return line
    const sku = line.sku?.trim()
    if (!sku) return line
    const ordered = Math.max(0, line.quantity || 0)
    const received = Math.min(ordered, confirmed.get(normalizeSku(sku)) ?? 0)
    return { ...line, quantityReceived: received }
  })
}

/**
 * Cierra el pendiente de bodega: ajusta cantidad pedida a lo ya ingresado (p. ej. OC 20, ingreso 15).
 */
export function alignPurchaseLinesToWarehouseReceived(
  purchaseId: string,
  lineItems: PurchaseLineItem[],
): PurchaseLineItem[] {
  const confirmed = confirmedIngresoQtyBySkuForPurchase(purchaseId)
  return lineItems.map((line) => {
    if (!isCatalogStockLine(line) || !line.sku?.trim()) return line
    const key = normalizeSku(line.sku)
    const received = confirmed.get(key) ?? 0
    if (received <= 0) {
      return { ...line, quantityReceived: 0 }
    }
    const ordered = Math.max(0, line.quantity || 0)
    if (received >= ordered) {
      return { ...line, quantityReceived: ordered }
    }
    return recalcPurchaseLine({
      ...line,
      quantity: received,
      quantityReceived: received,
    })
  })
}

export type WarehouseFulfillmentTotals = {
  quantityOrdered: number
  quantityInWarehouse: number
  quantityPendingWarehouse: number
  warehousePercent: number
}

/** Solo líneas de producto en catálogo (excluye servicios manuales de la OC). */
export function computeWarehouseFulfillmentTotals(
  purchaseId: string,
  lineItems: PurchaseLineItem[],
): WarehouseFulfillmentTotals {
  let quantityOrdered = 0
  let quantityInWarehouse = 0

  for (const line of lineItems) {
    if (!isCatalogStockLine(line)) continue
    const ordered = Math.max(0, line.quantity || 0)
    const pending = pendingWarehouseQtyForPurchaseLine(purchaseId, line)
    quantityOrdered += ordered
    quantityInWarehouse += ordered - pending
  }

  const quantityPendingWarehouse = Math.max(
    0,
    quantityOrdered - quantityInWarehouse,
  )
  const warehousePercent =
    quantityOrdered > 0
      ? Math.min(
          100,
          Math.round((quantityInWarehouse / quantityOrdered) * 100),
        )
      : 0

  return {
    quantityOrdered,
    quantityInWarehouse,
    quantityPendingWarehouse,
    warehousePercent,
  }
}
