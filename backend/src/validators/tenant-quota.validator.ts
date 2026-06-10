import { z } from 'zod'

export const updateTenantQuotasSchema = z.object({
  maxActiveUsers: z.number().int().min(1).max(10000).nullable().optional(),
  maxRecordsGb: z.number().min(0.1).max(10000).nullable().optional(),
  maxFilesGb: z.number().min(0.1).max(100000).nullable().optional(),
  gracePercent: z.number().min(0).max(50).optional(),
})

export const tenantDestructiveActionSchema = z.object({
  confirmSlug: z.string().trim().min(1).max(64),
})

export const createTenantInstanceSchema = z.object({
  displayName: z.string().trim().min(2, 'Indica un nombre de al menos 2 caracteres.').max(120),
  slug: z
    .string()
    .trim()
    .max(56)
    .regex(/^[a-z0-9-]*$/i, 'Solo letras, números y guiones.')
    .optional(),
})

export type UpdateTenantQuotasBody = z.infer<typeof updateTenantQuotasSchema>
export type TenantDestructiveActionBody = z.infer<typeof tenantDestructiveActionSchema>
export type CreateTenantInstanceBody = z.infer<typeof createTenantInstanceSchema>
