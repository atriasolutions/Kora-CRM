import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

const stockReceiptLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().uuid().optional(),
  product: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().optional(),
})

export const listStockReceiptsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})

export const createStockReceiptSchema = z.object({
  externalReference: z.string().optional(),
  purchaseId: z.string().uuid().optional(),
  purchaseReference: z.string().optional(),
  supplier: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  warehouse: z.string().optional(),
  ownerName: z.string().optional(),
  lineItems: z.array(stockReceiptLineSchema).optional(),
})

export const updateStockReceiptSchema = createStockReceiptSchema
  .partial()
  .extend({ status: z.enum(['Borrador', 'Confirmado']).optional() })
