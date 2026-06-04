export type StockReceiptStatus = 'Borrador' | 'Confirmado'

export type StockReceiptLineItemInput = {
  id?: string
  productId?: string
  product?: string
  sku?: string
  quantity?: number
}

export type StockReceiptListItem = {
  id: string
  number: string
  status: StockReceiptStatus
  externalReference: string
  purchaseId?: string
  purchaseReference?: string
  supplier?: string
  warehouse: string
  productSummary: string
  lineCount: number
  createdAt: string
  confirmedAt?: string
  owner: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type StockReceiptLineItem = {
  id: string
  productId?: string
  product: string
  sku: string
  quantity: number
}

export type StockReceiptDetail = StockReceiptListItem & {
  warehouseId?: string
  lineItems: StockReceiptLineItem[]
}

export type CreateStockReceiptInput = {
  externalReference?: string
  purchaseId?: string
  purchaseReference?: string
  supplier?: string
  warehouseId?: string
  warehouse?: string
  ownerName?: string
  lineItems?: StockReceiptLineItemInput[]
}

export type UpdateStockReceiptInput = Partial<CreateStockReceiptInput> & {
  status?: StockReceiptStatus
}
