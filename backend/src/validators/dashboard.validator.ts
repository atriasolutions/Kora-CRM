import { z } from 'zod'

export const dashboardViewSchema = z.enum(['ventas', 'operaciones', 'abastecimiento'])

export const dashboardQuerySchema = z.object({
  view: dashboardViewSchema.optional(),
  period: z.enum(['years']).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
})
