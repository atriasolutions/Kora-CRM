import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

const boletaLineSchema = z
  .object({
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
    subjectToVat: z.boolean().optional(),
    deferredPayment: z.boolean().optional(),
    deferredPaymentText: z.string().max(500).optional(),
  })
  .refine(
    (line) => !line.deferredPayment || Boolean(line.deferredPaymentText?.trim()),
    { message: 'Indica el texto de plazo diferido en la línea.' },
  )

const boletaStatusSchema = z.enum(['Borrador', 'Emitida', 'Anulada'])

const paymentMethodSchema = z.enum([
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Efectivo',
  'Crédito',
  'Otro',
])

export const listBoletasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  companyId: z.string().uuid().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})

export const createBoletaSchema = z
  .object({
    number: z.string().max(64).optional(),
    buyerName: z.string().max(255).optional(),
    buyerTaxId: z.string().max(64).optional(),
    companyId: z.string().uuid().optional(),
    companyName: z.string().optional(),
    contactId: z.string().uuid().optional(),
    contactName: z.string().optional(),
    amount: z.string().optional(),
    amountNum: z.number().optional(),
    amountCents: z.number().optional(),
    issueDate: z.string().optional(),
    status: boletaStatusSchema.optional(),
    ownerName: z.string().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    notes: z.string().max(2000).optional(),
    globalDiscount: z.string().max(16).optional(),
    lineItems: z.array(boletaLineSchema).optional(),
  })
  .superRefine((data, ctx) => {
    const status = data.status ?? 'Borrador'
    if (status === 'Emitida') {
      const lines = data.lineItems?.filter(
        (li) => (li.description?.trim() || li.productName?.trim()) && (li.quantity ?? 0) > 0,
      )
      if (!lines?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Agrega al menos una línea para emitir la boleta.',
          path: ['lineItems'],
        })
      }
    }
  })

export const updateBoletaSchema = z.object({
  number: z.string().max(64).optional(),
  buyerName: z.string().max(255).optional(),
  buyerTaxId: z.string().max(64).optional(),
  companyId: z.string().uuid().optional(),
  companyName: z.string().optional(),
  contactId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  amount: z.string().optional(),
  amountNum: z.number().optional(),
  amountCents: z.number().optional(),
  issueDate: z.string().optional(),
  status: boletaStatusSchema.optional(),
  ownerName: z.string().optional(),
  paymentMethod: paymentMethodSchema.optional(),
  notes: z.string().max(2000).optional(),
  globalDiscount: z.string().max(16).optional(),
  lineItems: z.array(boletaLineSchema).optional(),
})
