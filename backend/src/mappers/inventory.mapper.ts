import type {
  InventoryDetail,
  InventoryListItem,
  InventoryMovementLine,
  InventoryStatus,
} from '../types/inventory.js'
import { formatInventoryLastMovement } from './purchase.mapper.js'
import { formatActivityLabel, toIsoString } from '../utils/format.js'

export type InventoryRow = {
  id: string
  product_id: string | null
  product_name: string
  sku: string
  warehouse_id: string | null
  warehouse_name: string
  quantity_on_hand: string | number
  quantity_reserved: string | number
  quantity_available: string | number
  min_stock: string | number | null
  status: InventoryStatus | null
  last_movement_at: Date | null
  created_at: Date
  updated_at: Date
  product_category_name?: string | null
  product_owner_name?: string | null
  product_cost_price_cents?: string | number | null
}

export type StockMovementRow = {
  id: string
  inventory_position_id: string | null
  movement_type: string
  reference: string | null
  quantity_delta: string | number
  occurred_at: Date
  author_name: string | null
  source_kind: string | null
  source_id: string | null
}

function formatQtyLabel(value: number): string {
  return `${value} u.`
}

function formatClp(cents: string | number | null | undefined): string {
  if (cents == null) return ''
  const n = Math.round(Number(cents) / 100)
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function productMetaFromRow(row: InventoryRow): {
  category: string
  owner: string
  unitCost: string
} {
  return {
    category: row.product_category_name?.trim() || '',
    owner: row.product_owner_name?.trim() || '—',
    unitCost: formatClp(row.product_cost_price_cents),
  }
}

export function deriveInventoryStatus(
  onHand: number,
  reserved: number,
  minStock: number,
  current: InventoryStatus | null,
): InventoryStatus {
  if (current === 'En tránsito') return 'En tránsito'
  return deriveOperationalInventoryStatus(onHand, reserved, minStock, current)
}

/** Estado operativo: disponible = en bodega; reservado es compromiso comercial aparte. */
export function deriveOperationalInventoryStatus(
  onHand: number,
  reserved: number,
  minStock: number,
  seedStatus?: string | null,
): InventoryStatus {
  if (onHand <= 0 && reserved > 0) return 'Quiebre de stock'
  if (onHand <= 0) return 'Sin stock'
  if (reserved > onHand) return 'Quiebre de stock'
  if (minStock > 0 && onHand < minStock) return 'Stock bajo'
  if (seedStatus === 'En tránsito' && onHand > 0) return 'En tránsito'
  if (seedStatus === 'En tránsito') return 'En tránsito'
  return 'En stock'
}

export function mapInventoryRow(row: InventoryRow): InventoryListItem {
  const onHand = Number(row.quantity_on_hand ?? 0)
  const reserved = Number(row.quantity_reserved ?? 0)
  const available = Number(row.quantity_available ?? onHand)
  const minStockNum = Number(row.min_stock ?? 0)
  const status = deriveInventoryStatus(onHand, reserved, minStockNum, row.status)

  return {
    id: row.id,
    productName: row.product_name,
    sku: row.sku,
    location: row.warehouse_name,
    quantity: formatQtyLabel(onHand),
    quantityNum: onHand,
    reservedQtyNum: reserved,
    availableQtyNum: available,
    onHandQtyNum: onHand,
    minStock: formatQtyLabel(minStockNum),
    minStockNum,
    status,
    lastMovement: formatInventoryLastMovement(row.last_movement_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

export function mapMovementRow(
  row: StockMovementRow,
  balanceLabel: string,
): InventoryMovementLine {
  const delta = Number(row.quantity_delta ?? 0)
  const sign = delta >= 0 ? '+' : ''
  let type: InventoryMovementLine['type'] = 'Ajuste'
  const mt = row.movement_type.toLowerCase()
  if (mt.includes('entrada')) type = 'Entrada'
  else if (mt.includes('salida')) type = 'Salida'
  else if (mt.includes('traslado')) type = 'Traslado'
  else if (mt.includes('reserva')) type = 'Reserva'

  return {
    id: row.id,
    type,
    reference: row.reference ?? '',
    quantity: `${sign}${delta}`,
    balance: balanceLabel,
    when: formatActivityLabel(row.occurred_at),
    author: row.author_name ?? 'Sistema',
    sourceKind: row.source_kind ?? undefined,
    sourceId: row.source_id ?? undefined,
  }
}

export function mapInventoryDetail(
  row: InventoryRow,
  movements: StockMovementRow[],
): InventoryDetail {
  const list = mapInventoryRow(row)
  const meta = productMetaFromRow(row)
  return {
    ...list,
    ...meta,
    movements: movements.map((m) => mapMovementRow(m, list.quantity)),
  }
}
