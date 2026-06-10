import { z } from 'zod'

export const createBankAccountSchema = z.object({
  accountName: z.string().min(1).max(255),
  bankCode: z.string().min(1).max(64),
  accountType: z.string().min(1).max(64),
  accountNumber: z.string().min(1).max(64),
  email: z.string().email().max(255).optional().or(z.literal('')),
  isDefault: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
})

export const updateBankAccountSchema = createBankAccountSchema.partial()
