import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

import { entityImageUrlSchema } from './image-url.schema.js'

const lifecycle = z.enum(['Prospecto', 'Cliente', 'Proveedor'])
const operationalStatus = z.enum(['Activa', 'Inactiva'])

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(255),
  logoUrl: entityImageUrlSchema,
  rut: z.string().max(32).optional(),
  headquartersStreet: z.string().max(2000).optional(),
  industry: z.string().max(128).optional(),
  city: z.string().max(128).optional(),
  employees: z.string().max(32).optional(),
  ownerName: z.string().max(255).optional(),
  lifecycle: lifecycle.optional(),
  operationalStatus: operationalStatus.optional(),
  website: z.string().max(512).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(64).optional(),
  description: z.string().max(10000).optional(),
})

export const updateCompanySchema = createCompanySchema.partial()

export const listCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
  lifecycle: z.string().optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})
