import { z } from 'zod'

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
})

const inventoryStatusSchema = z.enum([
  'En tránsito',
  'En stock',
  'Stock bajo',
  'Quiebre de stock',
  'Sin stock',
  'Reservado',
])

export const updateInventorySchema = z.object({
  quantityNum: z.number().optional(),
  minStockNum: z.number().optional(),
  status: inventoryStatusSchema.optional(),
})

export const adjustInventorySchema = z.object({
  quantityDelta: z.number(),
  note: z.string().optional(),
})
