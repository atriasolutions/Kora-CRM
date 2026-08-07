import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

const customerKind = z.enum(['empresa', 'contacto'])
const outcome = z.enum(['Abierta', 'Ganada', 'Perdida'])

const lineItemSchema = z.object({
  product: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  quantity: z.coerce.number().positive().optional(),
  unitPrice: z.string().max(32).optional(),
  discount: z.string().max(16).optional(),
})

export const createOpportunitySchema = z.object({
  name: z.string().min(1).max(255),
  customerKind: customerKind.optional(),
  companyId: z.string().uuid().nullable().optional(),
  company: z.string().max(255).optional(),
  contactId: z.string().uuid().nullable().optional(),
  contactName: z.string().max(255).optional(),
  amount: z.string().max(32).optional(),
  amountCents: z.coerce.number().int().min(0).optional(),
  stage: z.string().max(64).optional(),
  probability: z.string().max(16).optional(),
  closeDate: z.string().max(32).optional(),
  owner: z.string().max(255).optional(),
  type: z.string().max(64).optional(),
  priority: z.string().max(32).optional(),
  outcome: outcome.optional(),
  forecast: z.string().max(64).optional(),
  source: z.string().max(128).optional(),
  contactEmail: z.string().max(255).optional(),
  contactPhone: z.string().max(64).optional(),
  description: z.string().max(8000).optional(),
  decisionMaker: z.string().max(255).optional(),
  competitors: z.string().max(255).optional(),
  budget: z.string().max(128).optional(),
  buyingProcess: z.string().max(255).optional(),
  lossReason: z.string().max(255).optional(),
  lineItems: z.array(lineItemSchema).optional(),
})

export const updateOpportunitySchema = createOpportunitySchema.partial()

export const syncOpportunityQuoteSchema = z.object({
  quoteId: z.string().uuid(),
})

export const listOpportunitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
  stage: z.string().optional(),
  outcome: outcome.optional(),
  companyId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})
