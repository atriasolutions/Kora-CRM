import { z } from 'zod'

import { entityImageUrlSchema } from './image-url.schema.js'

const contactStatus = z.enum(['Prospecto', 'Cliente', 'Proveedor'])

export const createContactSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(255),
  subtitle: z.string().max(255).optional(),
  avatarUrl: entityImageUrlSchema,
  companyId: z.string().uuid().nullable().optional(),
  company: z.string().max(255).optional(),
  email: z.string().email().max(320).optional().or(z.literal('')),
  phone: z.string().max(64).optional(),
  mobilePhone: z.string().max(64).optional(),
  role: z.string().max(128).optional(),
  status: contactStatus.optional(),
  rut: z.string().max(32).optional(),
  streetAddress: z.string().max(2000).optional(),
  region: z.string().max(128).optional(),
  commune: z.string().max(128).optional(),
  linkedIn: z.string().max(512).optional(),
  source: z.string().max(128).optional(),
  initialNote: z.string().max(10000).optional(),
  ownerName: z.string().max(255).optional(),
})

export const updateContactSchema = createContactSchema.partial()

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().optional(),
  status: contactStatus.optional(),
  companyId: z.string().uuid().optional(),
  archived: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})
