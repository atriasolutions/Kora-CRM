import { z } from 'zod'

import { entityImageUrlSchema } from './image-url.schema.js'

export const invoicingModeSchema = z.enum(['manual', 'sii'])

export const updateOrganizationSettingsSchema = z.object({
  legalName: z.string().max(255).optional(),
  tradeName: z.string().max(255).optional(),
  tagline: z.string().max(255).optional(),
  rut: z.string().max(32).optional(),
  giro: z.string().max(255).optional(),
  address: z.string().optional(),
  city: z.string().max(128).optional(),
  region: z.string().max(128).optional(),
  commune: z.string().max(128).optional(),
  phone: z.string().max(64).optional(),
  email: z.string().max(320).optional(),
  logoUrl: entityImageUrlSchema,
  defaultVatPercent: z.number().min(0).max(100).optional(),
  invoicingMode: invoicingModeSchema.optional(),
  economicActivityCode: z.number().int().positive().max(99999999).nullable().optional(),
  defaultSolicitudAssigneeUserId: z.string().uuid().nullable().optional(),
  defaultSolicitudAssigneeName: z.string().max(255).optional(),
})

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(32).optional(),
  address: z.string().min(1).optional(),
  region: z.string().min(1).max(128).optional(),
  commune: z.string().min(1).max(128).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
})

export const updateWarehouseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(32).optional(),
  address: z.string().min(1).optional(),
  region: z.string().min(1).max(128).optional(),
  commune: z.string().min(1).max(128).optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
})

export const createProductCategorySchema = z.object({
  name: z.string().min(1).max(255),
  active: z.boolean().optional(),
})

export const updateProductCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  active: z.boolean().optional(),
})
