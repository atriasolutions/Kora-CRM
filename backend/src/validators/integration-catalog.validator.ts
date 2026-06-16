import { z } from 'zod'

const productStatus = z.enum(['Activo', 'Agotado', 'Borrador'])

export const integrationCategoriesQuerySchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v !== 'false'),
})

const includeImagesQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true')

export const integrationProductsByCategoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  status: productStatus.optional(),
  q: z.string().trim().optional(),
  includeImages: includeImagesQuery,
})

/** Catálogo completo en una sola respuesta (ideal cPanel / hosting simple). */
export const integrationCatalogSnapshotQuerySchema = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v !== 'false'),
  status: productStatus.optional(),
  includeImages: includeImagesQuery,
})
