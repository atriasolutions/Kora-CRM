export type InvoiceLineItemDto = {
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

export type InvoicePaymentDto = {
  id: string
  date: string
  amount: string
  method: string
  reference: string
  status: 'Confirmado' | 'Pendiente' | 'Rechazado'
}

export type DteStatus = 'draft' | 'signed' | 'submitted' | 'accepted' | 'rejected'

export type InvoiceDocumentKind = 'invoice' | 'credit_note' | 'debit_note'

export type InvoiceReferenceCode = 1 | 2 | 3

export type InvoiceSourceSummary = {
  id: string
  number: string
  siiNumber?: string
  dteType?: number
  issueDate: string
  amount: string
  amountNum: number
}

export type InvoiceListItem = {
  id: string
  number: string
  client: string
  customerKind?: string
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
  amount: string
  amountNum: number
  issueDate: string
  dueDate: string
  status: string
  owner: string
  quoteId?: string
  paymentMethod: string
  siiNumber?: string
  dteType?: number
  siiTrackId?: string
  dteStatus?: DteStatus
  siiEmittedAt?: string
  documentKind?: InvoiceDocumentKind
  sourceInvoiceId?: string
  referenceCode?: InvoiceReferenceCode
  referenceReason?: string
  taxableAmount?: string
  exemptAmount?: string
  taxAmount?: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type InvoiceDetail = InvoiceListItem & {
  quoteCode?: string
  globalDiscount?: string
  lineItems: InvoiceLineItemDto[]
  payments: InvoicePaymentDto[]
  sourceInvoice?: InvoiceSourceSummary
  relatedAdjustments?: InvoiceListItem[]
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export type InvoiceLineItemInput = {
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

export type CreateInvoiceInput = {
  number?: string
  customerKind?: string
  companyId?: string | null
  companyName?: string
  contactId?: string | null
  contactName?: string
  quoteId?: string | null
  amount?: string
  amountCents?: number
  amountNum?: number
  issueDate?: string
  dueDate?: string
  status?: string
  ownerName?: string
  paymentMethod?: string
  siiNumber?: string
  globalDiscount?: string
  lineItems?: InvoiceLineItemInput[]
}

export type UpdateInvoiceInput = Partial<CreateInvoiceInput>

export type CreateInvoiceAdjustmentInput = {
  mode: 'full' | 'partial'
  referenceReason: string
  referenceCode?: InvoiceReferenceCode
  lineItems?: InvoiceLineItemInput[]
}

export type ListInvoicesParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  quoteId?: string
  companyId?: string
  archivedOnly?: boolean
  documentKind?: InvoiceDocumentKind | 'all'
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}
