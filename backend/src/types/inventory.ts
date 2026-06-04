export type InventoryStatus =
  | 'En tránsito'
  | 'En stock'
  | 'Stock bajo'
  | 'Quiebre de stock'
  | 'Sin stock'
  | 'Reservado'

export type InventoryListItem = {
  id: string
  productName: string
  sku: string
  location: string
  quantity: string
  quantityNum: number
  reservedQtyNum: number
  availableQtyNum: number
  onHandQtyNum: number
  minStock: string
  minStockNum: number
  status: InventoryStatus
  lastMovement: string
  createdAt: string
  updatedAt: string
}

export type InventoryMovementLine = {
  id: string
  type: 'Entrada' | 'Salida' | 'Ajuste' | 'Traslado' | 'Reserva'
  reference: string
  quantity: string
  balance: string
  when: string
  author: string
  sourceKind?: string
  sourceId?: string
}

export type InventoryDetail = InventoryListItem & {
  movements: InventoryMovementLine[]
  category?: string
  owner?: string
  unitCost?: string
}

export type UpdateInventoryInput = {
  quantityNum?: number
  minStockNum?: number
  status?: InventoryStatus
}

export type AdjustInventoryInput = {
  quantityDelta: number
  note?: string
}
