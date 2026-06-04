export type OpportunityCustomerKind = 'empresa' | 'contacto'
export type OpportunityOutcome = 'Abierta' | 'Ganada' | 'Perdida'

export type OpportunityLineItemDto = {
  id: string
  product: string
  quantity: number
  unitPrice: string
  discount: string
  total: string
}

export type OpportunityListItem = {
  id: string
  name: string
  customerKind?: OpportunityCustomerKind
  company: string
  companyId?: string
  contactId?: string
  contactName: string
  amount: string
  weightedAmount: string
  stage: string
  probability: string
  closeDate: string
  owner: string
  type: string
  priority: string
  outcome: OpportunityOutcome
  forecast: string
  source: string
  contactEmail?: string
  contactPhone?: string
  description?: string
  decisionMaker?: string
  competitors?: string
  budget?: string
  buyingProcess?: string
  lossReason?: string
  primaryQuoteId?: string
  lastActivity: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type OpportunityDetailFields = {
  contactEmail: string
  contactPhone: string
  description: string
  decisionMaker: string
  competitors: string
  budget: string
  buyingProcess: string
  lossReason?: string
}

export type OpportunityDetail = OpportunityListItem &
  OpportunityDetailFields & {
    lineItems: OpportunityLineItemDto[]
  }

export type OpportunityLineItemInput = {
  product?: string
  description?: string
  quantity?: number
  unitPrice?: string
  discount?: string
}

export type CreateOpportunityInput = {
  name: string
  customerKind?: OpportunityCustomerKind
  companyId?: string | null
  company?: string
  contactId?: string | null
  contactName?: string
  amount?: string
  amountCents?: number
  stage?: string
  probability?: string
  closeDate?: string
  owner?: string
  type?: string
  priority?: string
  outcome?: OpportunityOutcome
  forecast?: string
  source?: string
  contactEmail?: string
  contactPhone?: string
  description?: string
  decisionMaker?: string
  competitors?: string
  budget?: string
  buyingProcess?: string
  lossReason?: string
  lineItems?: OpportunityLineItemInput[]
}

export type UpdateOpportunityInput = Partial<CreateOpportunityInput>
