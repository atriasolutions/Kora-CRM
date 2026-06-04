import { z } from 'zod'

export const mentionSearchQuerySchema = z.object({
  q: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(30).optional().default(12),
})
