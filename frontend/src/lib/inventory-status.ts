import type { InventoryListItem, InventoryStatus } from '@/data/inventory.mock'

export const INVENTORY_STATUS_DESCRIPTIONS: Record<InventoryStatus, string> = {
  'En stock': 'Hay unidades en bodega por encima del stock mínimo.',
  'Stock bajo': 'Las unidades en bodega están por debajo del mínimo configurado; conviene reponer.',
  'Quiebre de stock':
    'Hay más unidades reservadas (comprometidas) que las que existen físicamente en bodega.',
  'Sin stock': 'No hay unidades físicas en bodega.',
  Reservado: 'Hay unidades reservadas por cotizaciones aceptadas (se liberan al emitir la factura).',
  'En tránsito':
    'Unidades en órdenes de compra abiertas pendientes de recepción; aún no disponibles para venta.',
}

/** Calcula el estado operativo según en bodega y reservado (disponible = en bodega). */
export function deriveInventoryStatus(
  onHand: number,
  reserved: number,
  minStock: number,
  seedStatus?: InventoryStatus,
): InventoryStatus {
  if (onHand <= 0 && reserved > 0) return 'Quiebre de stock'
  if (onHand <= 0) return 'Sin stock'
  if (reserved > onHand) return 'Quiebre de stock'
  if (minStock > 0 && onHand < minStock) return 'Stock bajo'
  if (seedStatus === 'En tránsito' && onHand > 0) return 'En tránsito'
  if (seedStatus === 'En tránsito') return 'En tránsito'
  return 'En stock'
}

export function deriveInventoryStatusFromRow(
  row: Pick<
    InventoryListItem,
    'status' | 'minStockNum' | 'availableQtyNum' | 'reservedQtyNum' | 'quantityNum' | 'onHandQtyNum'
  >,
): InventoryStatus {
  const onHand = row.onHandQtyNum ?? row.availableQtyNum ?? row.quantityNum
  const reserved = row.reservedQtyNum ?? 0
  return deriveInventoryStatus(onHand, reserved, row.minStockNum, row.status)
}

export type InventoryKanbanColumn =
  | 'En stock'
  | 'Stock bajo'
  | 'Quiebre de stock'
  | 'Sin stock'
  | 'Reservado'

export function inventoryKanbanColumn(status: InventoryStatus): InventoryKanbanColumn {
  if (
    status === 'En stock' ||
    status === 'Stock bajo' ||
    status === 'Quiebre de stock' ||
    status === 'Sin stock' ||
    status === 'Reservado'
  ) {
    return status
  }
  return 'En stock'
}
