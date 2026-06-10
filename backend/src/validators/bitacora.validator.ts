import { z } from 'zod'

const hoursSchema = z.coerce
  .number()
  .refine((h) => h >= 0.5, { message: 'Mínimo 0,5 horas' })
  .refine((h) => h * 2 === Math.round(h * 2), {
    message: 'Las horas deben ser múltiplos de 0,5',
  })

const bitacoraFieldsSchema = z.object({
  solicitudId: z.string().uuid(),
  workDate: z.string().min(1),
  hours: hoursSchema,
  description: z.string().max(5000).optional(),
  isBillable: z.boolean().optional(),
  nonBillableReason: z.string().max(2000).nullish(),
  assignedUserId: z.string().uuid(),
  assignedUserName: z.string().optional(),
})

function validateNonBillableReason(
  data: {
    isBillable?: boolean
    nonBillableReason?: string | null
  },
  ctx: z.RefinementCtx,
) {
  const billable = data.isBillable !== false
  if (!billable) {
    const reason = data.nonBillableReason?.trim() ?? ''
    if (!reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indique el motivo cuando las horas no son facturables',
        path: ['nonBillableReason'],
      })
    }
  }
}

export const bitacoraDashboardQuerySchema = z.object({
  workDateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  workDateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  companyId: z.string().uuid().optional(),
  mine: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})

export const listBitacoraQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  solicitudId: z.string().uuid().optional(),
  mine: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  billable: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  workDateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  workDateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  companyId: z.string().uuid().optional(),
})

export const createBitacoraSchema = bitacoraFieldsSchema.superRefine(validateNonBillableReason)

export const updateBitacoraSchema = bitacoraFieldsSchema.partial().superRefine((data, ctx) => {
  if (data.isBillable === false) {
    validateNonBillableReason(data, ctx)
  }
})
