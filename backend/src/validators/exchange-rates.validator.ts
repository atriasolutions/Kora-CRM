import { z } from 'zod'

export const updateStoredExchangeRatesSchema = z.object({
  rateDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  ufClp: z.number().positive(),
  usdClp: z.number().positive(),
  eurClp: z.number().positive(),
})

export const syncExchangeRatesSchema = z.object({
  rateDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})
