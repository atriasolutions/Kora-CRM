import { z } from 'zod'

import { getRutValidationMessage } from '../lib/chile-rut.js'

const rutSchema = z
  .string()
  .min(1, 'El RUT es obligatorio.')
  .max(32)
  .superRefine((value, ctx) => {
    const message = getRutValidationMessage(value, true)
    if (message) {
      ctx.addIssue({ code: 'custom', message })
    }
  })

export const createBankAccountSchema = z.object({
  accountName: z.string().min(1).max(255),
  bankCode: z.string().min(1).max(64),
  accountType: z.string().min(1).max(64),
  accountNumber: z.string().min(1).max(64),
  rut: rutSchema,
  email: z.string().email().max(255).optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
})

export const updateBankAccountSchema = createBankAccountSchema.partial()
