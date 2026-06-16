import { isApiEnabled } from '@/api/config'
import { getInventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryDetail, InventoryMovementLine } from '@/data/inventory-detail.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import {
  getInventoryProductSummaryBySku,
  inventoryProductIdFromSku,
} from '@/lib/inventory-aggregate'
import { enrichInventoryDetailIfNeeded } from '@/lib/inventory-product-enrich'
import type { InventoryProductSummary } from '@/lib/inventory-aggregate'
import {
  enrichInventoryListItem,
  findInventoryBySkuAndLocation,
  formatQuantityLabel,
  getAllInventoryRows,
} from '@/lib/stock-service'

/** Detalle consolidado por SKU (alineado con la vista de lista). */
export function buildInventoryDetailFromProductSummary(
  summary: InventoryProductSummary,
  movements: InventoryMovementLine[],
  baseRow?: InventoryListItem,
): InventoryDetail {
  const primary =
    summary.locationRows.find((r) => (r.onHandQtyNum ?? r.quantityNum) > 0) ??
    summary.locationRows[0]!
  const qtyTemplate = { quantity: primary.quantity }
  const warehouseLabel =
    summary.warehouseCount > 1
      ? `${summary.warehouseCount} bodegas`
      : primary.location

  return {
    ...(baseRow ?? primary),
    id: summary.id,
    recordEntityId: primary.id,
    isProductView: true,
    productName: summary.productName,
    sku: summary.sku,
    location: warehouseLabel,
    quantity: formatQuantityLabel(summary.onHandQtyNum, qtyTemplate),
    quantityNum: summary.onHandQtyNum,
    onHandQtyNum: summary.onHandQtyNum,
    reservedQtyNum: summary.reservedQtyNum,
    availableQtyNum: summary.availableQtyNum,
    minStock: summary.minStockLabel,
    minStockNum: summary.minStockNum,
    status: summary.status,
    description: `Existencias consolidadas de ${summary.productName} (${summary.sku}) en ${summary.warehouseCount} ubicación${summary.warehouseCount === 1 ? '' : 'es'}.`,
    owner: baseRow?.owner ?? '—',
    category: baseRow?.category ?? '',
    unitCost: baseRow?.unitCost ?? '',
    warehouseZone: baseRow?.warehouseZone ?? '',
    movements,
    activities: [],
    notes: [],
    files: [],
    pendingActivities: 0,
    stockHealthPercent:
      summary.minStockNum > 0
        ? Math.min(
            100,
            Math.round((summary.availableQtyNum / summary.minStockNum) * 100),
          )
        : 100,
    inTransitQtyNum: summary.inTransitQtyNum,
    inTransitLabel: summary.inTransitLabel,
    tags: [
      summary.status === 'Stock bajo' || summary.status === 'Quiebre de stock'
        ? 'Reposición sugerida'
        : 'Inventario activo',
      `${summary.warehouseCount} bodega${summary.warehouseCount === 1 ? '' : 's'}`,
    ],
    nextStep:
      summary.status === 'Stock bajo' ||
      summary.status === 'Sin stock' ||
      summary.status === 'Quiebre de stock'
        ? { title: 'Generar solicitud de reposición', when: 'Mañana, 09:00' }
        : undefined,
  }
}

function buildInventoryDetailFromListRow(row: InventoryListItem): InventoryDetail {
  const enriched = enrichInventoryListItem(row)
  const available = enriched.availableQtyNum ?? enriched.quantityNum
  return {
    ...enriched,
    recordEntityId: row.id,
    description: `Control de existencias para ${enriched.productName} (${enriched.sku}) en ${enriched.location}.`,
    owner: '—',
    category: '',
    unitCost: '',
    warehouseZone: '',
    movements: [],
    activities: [],
    notes: [],
    files: [],
    pendingActivities: 0,
    stockHealthPercent:
      enriched.minStockNum > 0
        ? Math.min(100, Math.round((available / enriched.minStockNum) * 100))
        : 100,
    tags: [],
  }
}

/** Detalle para el diálogo de ajuste desde una fila de lista (sin datos mock en API). */
export function buildInventoryDetailForAdjustment(row: InventoryListItem): InventoryDetail {
  if (!isApiEnabled()) {
    if (getAllInventoryRows().some((r) => r.id === row.id)) {
      return getInventoryDetail(row.id)
    }
    const atLocation = findInventoryBySkuAndLocation(row.sku, row.location)
    if (atLocation) return getInventoryDetail(atLocation.id)
    return getInventoryDetail(inventoryProductIdFromSku(row.sku))
  }

  const summary = getInventoryProductSummaryBySku(row.sku)
  if (summary) {
    return enrichInventoryDetailIfNeeded(
      buildInventoryDetailFromProductSummary(summary, [], row),
    )
  }

  return enrichInventoryDetailIfNeeded(buildInventoryDetailFromListRow(row))
}
