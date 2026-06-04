import { z } from 'zod'

export const globalSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Escribe al menos un carácter').max(120),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
})
