import { isApiEnabled } from '@/api/config'
import { listInventoryApi } from '@/api/inventory'
import { getInventoryProductSummaryBySku } from '@/lib/inventory-aggregate'
import { normalizeSku } from '@/lib/stock-sku'

export type ProductInventoryStockSummary = {
  positionCount: number
  onHandQty: number
  availableQty: number
  reservedQty: number
}

function summaryFromRows(
  rows: { quantityNum: number; availableQtyNum?: number; reservedQtyNum?: number }[],
): ProductInventoryStockSummary {
  let onHandQty = 0
  let availableQty = 0
  let reservedQty = 0
  for (const row of rows) {
    const onHand = row.quantityNum ?? 0
    const reserved = row.reservedQtyNum ?? 0
    const available = row.availableQtyNum ?? Math.max(0, onHand - reserved)
    onHandQty += onHand
    reservedQty += reserved
    availableQty += available
  }
  return {
    positionCount: rows.length,
    onHandQty,
    availableQty,
    reservedQty,
  }
}

/** Totales de inventario para un SKU (API o registry local). */
export async function resolveProductInventoryStockSummary(
  sku: string,
): Promise<ProductInventoryStockSummary | null> {
  const key = normalizeSku(sku)
  if (!key) return null

  if (isApiEnabled()) {
    const rows = await listInventoryApi()
    const matching = rows.filter((row) => normalizeSku(row.sku) === key)
    if (matching.length === 0) return null
    return summaryFromRows(matching)
  }

  const summary = getInventoryProductSummaryBySku(sku)
  if (!summary || summary.locationRows.length === 0) return null
  return summaryFromRows(summary.locationRows)
}

export function hasInventoryPositions(
  summary: ProductInventoryStockSummary | null,
): boolean {
  return (summary?.positionCount ?? 0) > 0
}

/** Hay unidades en bodega o reservadas (requiere advertencia fuerte). */
export function hasSignificantInventoryStock(
  summary: ProductInventoryStockSummary | null,
): boolean {
  if (!summary) return false
  return summary.onHandQty > 0 || summary.availableQty > 0 || summary.reservedQty > 0
}

export function formatProductInventoryStockSummary(
  summary: ProductInventoryStockSummary,
): string {
  const parts: string[] = []
  if (summary.availableQty > 0) {
    parts.push(`${summary.availableQty} disponible${summary.availableQty === 1 ? '' : 's'}`)
  }
  if (summary.onHandQty > 0 && summary.onHandQty !== summary.availableQty) {
    parts.push(`${summary.onHandQty} en mano`)
  }
  if (summary.reservedQty > 0) {
    parts.push(`${summary.reservedQty} reservada${summary.reservedQty === 1 ? '' : 's'}`)
  }
  if (parts.length === 0) return 'sin unidades en bodega'
  return parts.join(' · ')
}
