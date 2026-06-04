import { z } from 'zod'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function paginationOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}
