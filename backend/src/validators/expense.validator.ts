import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
} from '../types/expense.js'

const expenseStatusSchema = z.enum(EXPENSE_STATUSES)
const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES)
const paymentMethodSchema = z.enum(EXPENSE_PAYMENT_METHODS)
const receiptUrlsSchema = z
  .array(z.string().trim().url('La URL del comprobante no es válida.').max(2048))
  .max(20, 'Puedes agregar hasta 20 comprobantes.')

const partnerLoanFields = {
  isPartnerLoan: z.boolean().optional(),
  partnerUserId: z.string().uuid().optional().nullable(),
  partnerName: z.string().max(255).optional(),
  partnerLoanReturned: z.boolean().optional(),
} as const

function refinePartnerLoan(
  data: {
    isPartnerLoan?: boolean
    partnerUserId?: string | null
    partnerName?: string
  },
  ctx: z.RefinementCtx,
) {
  if (!data.isPartnerLoan) return
  const hasPartner =
    Boolean(data.partnerUserId?.trim()) || Boolean(data.partnerName?.trim())
  if (!hasPartner) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Indica el socio a quien se debe devolver el préstamo.',
      path: ['partnerName'],
    })
  }
}

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  ownerName: z.string().max(255).optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})

export const createExpenseSchema = z
  .object({
    number: z.string().max(64).optional(),
    concept: z.string().max(255).optional(),
    category: expenseCategorySchema.optional(),
    expenseDate: z.string().optional(),
    amount: z.string().optional(),
    amountNum: z.number().optional(),
    amountCents: z.number().optional(),
    currency: z.string().max(8).optional(),
    paymentMethod: paymentMethodSchema.optional(),
    status: expenseStatusSchema.optional(),
    supplierId: z.string().uuid().optional().nullable(),
    supplierName: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
    receiptUrls: receiptUrlsSchema.optional(),
    ownerName: z.string().max(255).optional(),
    ...partnerLoanFields,
  })
  .superRefine((data, ctx) => {
    const status = data.status ?? 'Registrado'
    if (status === 'Registrado') {
      const concept = data.concept?.trim() ?? ''
      if (!concept) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Indica el concepto del gasto.',
          path: ['concept'],
        })
      }
      const hasAmount =
        (data.amountCents != null && data.amountCents > 0) ||
        (data.amountNum != null && data.amountNum > 0) ||
        Boolean(data.amount?.trim())
      if (!hasAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El monto debe ser mayor a cero.',
          path: ['amount'],
        })
      }
    }
    refinePartnerLoan(data, ctx)
  })

export const updateExpenseSchema = z
  .object({
    number: z.string().max(64).optional(),
    concept: z.string().max(255).optional(),
    category: expenseCategorySchema.optional(),
    expenseDate: z.string().optional(),
    amount: z.string().optional(),
    amountNum: z.number().optional(),
    amountCents: z.number().optional(),
    currency: z.string().max(8).optional(),
    paymentMethod: paymentMethodSchema.optional(),
    status: expenseStatusSchema.optional(),
    supplierId: z.string().uuid().optional().nullable(),
    supplierName: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
    receiptUrls: receiptUrlsSchema.optional(),
    ownerName: z.string().max(255).optional(),
    ...partnerLoanFields,
  })
  .superRefine((data, ctx) => {
    if (data.isPartnerLoan === true) refinePartnerLoan(data, ctx)
  })
