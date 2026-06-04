import type { InventoryMovementLine } from '@/data/inventory-detail.mock'
import type {
  InventoryMovementAdjustmentDetail,
  InventoryMovementSourceKind,
} from '@/lib/inventory-movement'

export type StockReservationStatus =
  | 'active'
  | 'transferred'
  | 'committed'
  | 'released'

export type StockReservationRecord = {
  id: string
  inventoryId: string
  sku: string
  productId?: string
  qty: number
  quoteId?: string
  invoiceId?: string
  quoteLineId?: string
  status: StockReservationStatus
  createdAt: number
}

export type StockMovementRecord = {
  id: string
  inventoryId: string
  type: InventoryMovementLine['type'] | 'Liberación'
  reference: string
  quantityDelta: number
  reservedDelta: number
  when: string
  author: string
  sourceKind?: InventoryMovementSourceKind
  sourceId?: string
  adjustmentDetail?: InventoryMovementAdjustmentDetail
}

export type InventoryLedger = {
  /** Ajuste acumulado sobre quantityNum base (entradas +, salidas −). */
  quantityAdjustment: number
}

export type StockOperationResult = {
  ok: boolean
  message?: string
  warnings?: string[]
}

export type StockLineInput = {
  id: string
  sku: string
  productId?: string
  quantity: number
  description?: string
}
