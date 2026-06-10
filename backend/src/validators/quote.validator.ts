import { z } from 'zod'

const lineItemSchema = z
  .object({
    productId: z.string().uuid().nullable().optional(),
    sku: z.string().max(64).optional(),
    productName: z.string().max(255).optional(),
    description: z.string().max(2000).optional(),
    quantity: z.coerce.number().positive().optional(),
    unitPrice: z.string().max(32).optional(),
    unitPriceOriginal: z.coerce.number().optional(),
    priceCurrency: z.string().max(8).optional(),
    discount: z.string().max(16).optional(),
    subjectToVat: z.boolean().optional(),
    deferredPayment: z.boolean().optional(),
    deferredPaymentText: z.string().max(500).optional(),
  })
  .refine(
    (line) => !line.deferredPayment || Boolean(line.deferredPaymentText?.trim()),
    { message: 'Indica el texto de plazo diferido en la línea.' },
  )

export const createQuoteSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  title: z.string().min(1).max(255),
  opportunityId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  amount: z.string().max(32).optional(),
  amountCents: z.coerce.number().int().min(0).optional(),
  status: z.string().max(64).optional(),
  validUntil: z.string().max(32).optional(),
  issueDate: z.string().max(32).optional(),
  owner: z.string().max(255).optional(),
  customerKind: z.string().max(32).optional(),
  paymentTerms: z.string().max(255).optional(),
  deliveryTerms: z.string().max(255).optional(),
  terms: z.string().max(10000).optional(),
  globalDiscount: z.string().max(16).optional(),
  includeBankDetails: z.boolean().optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  lineItems: z.array(lineItemSchema).optional(),
})

export const updateQuoteSchema = createQuoteSchema.partial()

export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
  status: z.string().max(64).optional(),
  opportunityId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})
