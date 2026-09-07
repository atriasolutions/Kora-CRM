export type PurchaseStatus = 'Borrador' | 'Emitida' | 'Confirmada'

export type PurchasePaymentStatus = 'Pendiente' | 'Pagada'

export type PurchaseLineItemInput = {
  id?: string
  productId?: string
  product?: string
  sku?: string
  description?: string
  quantity?: number
  quantityReceived?: number
  unitPrice?: string
  unitPriceOriginal?: number | string
  priceCurrency?: string
  discount?: string
  total?: string
}

export type PurchaseListItem = {
  id: string
  reference: string
  supplier: string
  supplierId?: string
  productSummary: string
  orderDate: string
  amount: string
  amountNum: number
  status: PurchaseStatus
  paymentStatus: PurchasePaymentStatus
  paidAt?: string
  owner: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type PurchaseLineItem = {
  id: string
  productId?: string
  product: string
  description?: string
  sku?: string
  quantity: number
  quantityReceived: number
  unitPrice: string
  unitPriceOriginal?: string
  priceCurrency?: string
  discount: string
  total: string
}

export type PurchaseDetailFields = {
  description?: string
  expectedDelivery?: string
  paymentTerms?: string
  warehouseId?: string
  warehouse?: string
  deliveryAddress?: string
  supplierContactId?: string
  supplierContact?: string
  supplierEmail?: string
  supplierPhone?: string
}

export type PurchaseDetail = PurchaseListItem & PurchaseDetailFields & {
  lineItems: PurchaseLineItem[]
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export type CreatePurchaseInput = PurchaseDetailFields & {
  reference?: string
  supplierId?: string
  supplier?: string
  productSummary?: string
  orderDate?: string
  amount?: string
  amountNum?: number
  amountCents?: number
  status?: PurchaseStatus
  paymentStatus?: PurchasePaymentStatus
  paidAt?: string | null
  ownerName?: string
  lineItems?: PurchaseLineItemInput[]
}

export type UpdatePurchaseInput = Partial<CreatePurchaseInput>
