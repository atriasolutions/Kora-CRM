import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  period: z.enum(['years']).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
})
