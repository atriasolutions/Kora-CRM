export type BoletaLineItemDto = {
  id: string
  sku: string
  productId?: string
  description: string
  quantity: number
  unitPrice: string
  unitPriceOriginal?: string
  unitPriceOriginalNum?: number
  priceCurrency?: string
  discount: string
  total: string
  subjectToVat?: boolean
  deferredPayment?: boolean
  deferredPaymentText?: string
}

export type BoletaListItem = {
  id: string
  number: string
  buyerName: string
  buyerTaxId?: string
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
  amount: string
  amountNum: number
  issueDate: string
  status: string
  owner: string
  paymentMethod: string
  taxableAmount?: string
  exemptAmount?: string
  taxAmount?: string
  notes?: string
  printedAt?: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type BoletaDetail = BoletaListItem & {
  globalDiscount?: string
  lineItems: BoletaLineItemDto[]
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export type BoletaLineItemInput = {
  id?: string
  productId?: string | null
  sku?: string
  productName?: string
  description?: string
  quantity?: number
  unitPrice?: string
  unitPriceOriginal?: number | string
  priceCurrency?: string
  discount?: string
  subjectToVat?: boolean
  deferredPayment?: boolean
  deferredPaymentText?: string
}

export type CreateBoletaInput = {
  number?: string
  buyerName?: string
  buyerTaxId?: string
  companyId?: string | null
  companyName?: string
  contactId?: string | null
  contactName?: string
  amount?: string
  amountCents?: number
  amountNum?: number
  issueDate?: string
  status?: string
  ownerName?: string
  paymentMethod?: string
  notes?: string
  globalDiscount?: string
  lineItems?: BoletaLineItemInput[]
}

export type UpdateBoletaInput = Partial<CreateBoletaInput>

export type ListBoletasParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  paymentMethod?: string
  companyId?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}
