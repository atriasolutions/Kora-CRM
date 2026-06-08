import { z } from 'zod'

const invoiceLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().uuid().optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.string().optional(),
  unitPriceOriginal: z.coerce.number().optional(),
  priceCurrency: z.string().max(8).optional(),
  discount: z.string().optional(),
})

const invoiceStatusSchema = z.enum([
  'Pagada',
  'Pendiente',
  'Vencida',
  'Borrador',
  'Anulada',
])

const paymentMethodSchema = z.enum([
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Efectivo',
  'Crédito',
  'Otro',
])

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  quoteId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})

export const createInvoiceSchema = z.object({
  number: z.string().max(64).optional(),
  customerKind: z.enum(['contacto', 'empresa']).optional(),
  companyId: z.string().uuid().optional(),
  companyName: z.string().optional(),
  contactId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  quoteId: z.string().uuid().optional(),
  amount: z.string().optional(),
  amountNum: z.number().optional(),
  amountCents: z.number().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: invoiceStatusSchema.optional(),
  ownerName: z.string().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  siiNumber: z.string().max(64).optional(),
  globalDiscount: z.string().max(16).optional(),
  lineItems: z.array(invoiceLineSchema).optional(),
})

export const updateInvoiceSchema = createInvoiceSchema.partial()
