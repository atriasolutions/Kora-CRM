import type { InventoryMovementLine } from '@/data/inventory-detail.mock'
import type { InventoryListItem, InventoryStatus } from '@/data/inventory.mock'
import { getAllWarehouseLocationNames } from '@/lib/catalog-settings'
import { deriveInventoryStatus } from '@/lib/inventory-status'
import {
  enrichInventoryListItem,
  formatQuantityLabel,
  getAllInventoryRows,
  stockMovementsForInventory,
} from '@/lib/stock-service'
import {
  buildInTransitQtyBySku,
  formatInTransitLabel,
  inTransitLinesFromPurchases,
} from '@/lib/inventory-in-transit'
import { normalizeSku } from '@/lib/stock-sku'

export type InventoryProductSummary = {
  /** Id estable para lista y rutas: `sku-{normalized}` */
  id: string
  sku: string
  productName: string
  availableQtyNum: number
  reservedQtyNum: number
  onHandQtyNum: number
  minStockNum: number
  availableLabel: string
  reservedLabel: string
  minStockLabel: string
  /** Unidades en OC abiertas aún no recibidas (suma por SKU). */
  inTransitQtyNum: number
  inTransitLabel: string
  status: InventoryStatus
  warehouseCount: number
  /** Filas de inventario (bodegas) que componen este producto */
  locationRows: (InventoryListItem & {
    reservedQtyNum: number
    availableQtyNum: number
    onHandQtyNum: number
  })[]
}

const SKU_ID_PREFIX = 'sku-'

export function inventoryProductIdFromSku(sku: string): string {
  return `${SKU_ID_PREFIX}${encodeURIComponent(normalizeSku(sku))}`
}

export function skuFromInventoryProductId(id: string): string | null {
  if (!id.startsWith(SKU_ID_PREFIX)) return null
  try {
    return decodeURIComponent(id.slice(SKU_ID_PREFIX.length))
  } catch {
    return id.slice(SKU_ID_PREFIX.length)
  }
}

export function isInventoryProductId(id: string): boolean {
  return id.startsWith(SKU_ID_PREFIX)
}

function deriveProductStatus(
  onHand: number,
  reserved: number,
  minStock: number,
  rows: InventoryListItem[],
): import('@/data/inventory.mock').InventoryStatus {
  const seedStatus = rows.some((r) => r.status === 'En tránsito')
    ? 'En tránsito'
    : rows[0]?.status
  return deriveInventoryStatus(onHand, reserved, minStock, seedStatus)
}

function unitSuffixFromRows(rows: InventoryListItem[]): string {
  const sample = rows[0]?.quantity ?? 'u.'
  const match = sample.replace(/^[\d.,\s]+/u, '').trim()
  return match || 'u.'
}

type EnrichedLocationRow = InventoryProductSummary['locationRows'][number]

function expandLocationRowsToAllWarehouses(
  locationRows: EnrichedLocationRow[],
  allLocations: string[],
): EnrichedLocationRow[] {
  if (locationRows.length === 0 || allLocations.length === 0) return locationRows

  const template = locationRows[0]!
  const byLoc = new Map(
    locationRows.map((r) => [r.location.trim().toLowerCase(), r]),
  )
  const unit = unitSuffixFromRows(locationRows)

  return allLocations.map((loc) => {
    const existing = byLoc.get(loc.trim().toLowerCase())
    if (existing) return existing
    return {
      ...template,
      id: `${template.id}::${encodeURIComponent(loc)}`,
      location: loc,
      quantity: `0 ${unit}`,
      quantityNum: 0,
      onHandQtyNum: 0,
      reservedQtyNum: 0,
      availableQtyNum: 0,
      status: 'Sin stock' as InventoryStatus,
      lastMovement: '—',
    }
  })
}

export function aggregateInventoryProducts(
  rows: InventoryListItem[],
): InventoryProductSummary[] {
  const enriched = rows.map((row) => enrichInventoryListItem(row))
  const inTransitBySku = buildInTransitQtyBySku()
  const bySku = new Map<string, typeof enriched>()

  for (const row of enriched) {
    const key = normalizeSku(row.sku)
    const bucket = bySku.get(key) ?? []
    bucket.push(row)
    bySku.set(key, bucket)
  }

  const allWarehouseNames = getAllWarehouseLocationNames()
  const summaries: InventoryProductSummary[] = []

  for (const [, locationRows] of bySku) {
    const first = locationRows[0]!
    const onHandQtyNum = locationRows.reduce((s, r) => s + (r.onHandQtyNum ?? r.quantityNum ?? 0), 0)
    const reservedQtyNum = locationRows.reduce((s, r) => s + (r.reservedQtyNum ?? 0), 0)
    const availableQtyNum = onHandQtyNum
    const minStockNum = Math.max(...locationRows.map((r) => r.minStockNum))
    const unit = unitSuffixFromRows(locationRows)
    const qtyTemplate = { quantity: `0 ${unit}` }
    const inTransitQtyNum = inTransitBySku.get(normalizeSku(first.sku)) ?? 0

    summaries.push({
      id: inventoryProductIdFromSku(first.sku),
      sku: first.sku,
      productName: first.productName,
      availableQtyNum,
      reservedQtyNum,
      onHandQtyNum,
      minStockNum,
      availableLabel: formatQuantityLabel(availableQtyNum, qtyTemplate),
      reservedLabel: formatQuantityLabel(reservedQtyNum, qtyTemplate),
      minStockLabel: formatQuantityLabel(minStockNum, qtyTemplate),
      inTransitQtyNum,
      inTransitLabel: formatInTransitLabel(inTransitQtyNum, qtyTemplate),
      status:
        inTransitQtyNum > 0 && onHandQtyNum <= 0
          ? 'En tránsito'
          : deriveProductStatus(
              onHandQtyNum,
              reservedQtyNum,
              minStockNum,
              locationRows,
            ),
      warehouseCount: allWarehouseNames.length,
      locationRows: expandLocationRowsToAllWarehouses(
        [...locationRows].sort((a, b) => a.location.localeCompare(b.location, 'es')),
        allWarehouseNames,
      ),
    })
  }

  const inTransitOnlyBySku = new Map<
    string,
    { sku: string; productName: string; inTransitQtyNum: number }
  >()
  for (const line of inTransitLinesFromPurchases()) {
    const key = normalizeSku(line.sku)
    if (bySku.has(key)) continue
    const existing = inTransitOnlyBySku.get(key)
    if (existing) {
      existing.inTransitQtyNum += line.pendingQty
    } else {
      inTransitOnlyBySku.set(key, {
        sku: line.sku,
        productName: line.productName,
        inTransitQtyNum: line.pendingQty,
      })
    }
  }

  for (const orphan of inTransitOnlyBySku.values()) {
    const qtyTemplate = { quantity: '0 u.' }
    summaries.push({
      id: inventoryProductIdFromSku(orphan.sku),
      sku: orphan.sku,
      productName: orphan.productName,
      availableQtyNum: 0,
      reservedQtyNum: 0,
      onHandQtyNum: 0,
      minStockNum: 0,
      availableLabel: formatQuantityLabel(0, qtyTemplate),
      reservedLabel: formatQuantityLabel(0, qtyTemplate),
      minStockLabel: formatQuantityLabel(0, qtyTemplate),
      inTransitQtyNum: orphan.inTransitQtyNum,
      inTransitLabel: formatInTransitLabel(orphan.inTransitQtyNum, qtyTemplate),
      status: 'En tránsito',
      warehouseCount: allWarehouseNames.length,
      locationRows: [],
    })
  }

  return summaries.sort((a, b) =>
    a.productName.localeCompare(b.productName, 'es'),
  )
}

export function inventoryProductMatchesSearch(
  product: InventoryProductSummary,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    product.productName.toLowerCase().includes(q) ||
    product.sku.toLowerCase().includes(q)
  )
}

export function inventoryProductMatchesFilters(
  product: InventoryProductSummary,
  filters: import('@/lib/inventory-filters').InventoryFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(product.status)) {
    return false
  }
  if (filters.locations.length > 0) {
    const hasLocation = product.locationRows.some((r) =>
      filters.locations.includes(r.location),
    )
    if (!hasLocation) return false
  }
  return true
}

export function getInventoryProductSummaryBySku(sku: string): InventoryProductSummary | null {
  const key = normalizeSku(sku)
  const all = aggregateInventoryProducts(getAllInventoryRows())
  return all.find((p) => normalizeSku(p.sku) === key) ?? null
}

export function getInventoryProductSummaryById(id: string): InventoryProductSummary | null {
  const fromSku = skuFromInventoryProductId(id)
  if (fromSku) return getInventoryProductSummaryBySku(fromSku)
  const row = getAllInventoryRows().find((r) => r.id === id)
  if (row) return getInventoryProductSummaryBySku(row.sku)
  return null
}

export function stockMovementsForSku(sku: string): InventoryMovementLine[] {
  const product = getInventoryProductSummaryBySku(sku)
  if (!product) return []

  const merged: InventoryMovementLine[] = []
  for (const row of product.locationRows) {
    const fromLedger = stockMovementsForInventory(row.id)
    const withLocation = fromLedger.map((mv) => ({
      ...mv,
      reference:
        fromLedger.length > 1 || product.warehouseCount > 1
          ? `${mv.reference} · ${row.location}`
          : mv.reference,
    }))
    merged.push(...withLocation)
  }

  if (merged.length > 0) {
    return merged.sort((a, b) => b.when.localeCompare(a.when, 'es'))
  }

  const demo = product.locationRows[0]
  if (!demo) return []
  return [
    {
      id: `${product.id}-mov-1`,
      type: 'Entrada',
      reference: 'Ingreso ING-2024-0012',
      quantity: '+50',
      balance: demo.quantity,
      when: '16 may 2024',
      author: 'María López',
      sourceKind: 'ingreso',
      sourceId: 'sr1',
    },
    {
      id: `${product.id}-mov-2`,
      type: 'Salida',
      reference: 'FAC FAC-2024-0842',
      quantity: '-12',
      balance: demo.quantity,
      when: '14 may 2024',
      author: 'Carlos Vega',
      sourceKind: 'factura',
      sourceId: 'inv1',
    },
  ]
}

export function inventoryProductDetailPath(sku: string): string {
  return `/inventario/${inventoryProductIdFromSku(sku)}`
}
