export type QuoteLineItemDto = {
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

export type QuoteListItem = {
  id: string
  code: string
  title: string
  opportunityId: string
  opportunityName: string
  companyName: string
  companyId?: string
  contactId?: string
  contactName: string
  amount: string
  status: string
  validUntil: string
  issueDate: string
  owner: string
  customerKind?: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type QuoteDetail = QuoteListItem & {
  lineItems: QuoteLineItemDto[]
  globalDiscount?: string
  includeBankDetails?: boolean
  bankAccountId?: string | null
  paymentTerms: string
  deliveryTerms: string
  terms: string
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export type QuoteLineItemInput = {
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

export type CreateQuoteInput = {
  code?: string
  title: string
  opportunityId?: string | null
  companyId?: string | null
  contactId?: string | null
  amount?: string
  amountCents?: number
  status?: string
  validUntil?: string
  issueDate?: string
  owner?: string
  customerKind?: string
  paymentTerms?: string
  deliveryTerms?: string
  terms?: string
  globalDiscount?: string
  includeBankDetails?: boolean
  bankAccountId?: string | null
  lineItems?: QuoteLineItemInput[]
}

export type UpdateQuoteInput = Partial<CreateQuoteInput>
