import { z } from 'zod'

import { entityImageUrlSchema } from './image-url.schema.js'

const productStatus = z.enum(['Activo', 'Agotado', 'Borrador'])

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(64),
  ownerName: z.string().max(255).optional(),
  category: z.string().max(128).optional(),
  productType: z.string().max(64).optional(),
  unitOfMeasure: z.string().max(32).optional(),
  billingPeriod: z.string().max(32).optional(),
  priceNum: z.coerce.number().min(0).optional(),
  priceCurrency: z.enum(['CLP', 'UF', 'USD', 'EUR']).optional(),
  costPriceNum: z.coerce.number().min(0).optional(),
  stockNum: z.coerce.number().int().optional(),
  status: productStatus.optional(),
  imageUrl: entityImageUrlSchema,
  barcode: z.string().max(64).optional(),
  description: z.string().max(8000).optional(),
  brand: z.string().max(255).optional(),
  publishInIntegration: z.boolean().optional(),
  publishPriceInIntegration: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  maxStock: z.coerce.number().int().min(0).optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
  status: productStatus.optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})
