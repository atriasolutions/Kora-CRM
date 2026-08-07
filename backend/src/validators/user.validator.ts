import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

import { entityImageUrlSchema } from './image-url.schema.js'

const userStatus = z.enum(['Activo', 'Invitado', 'Inactivo', 'Por verificar'])

const birthDateSchema = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato YYYY-MM-DD'),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    return value
  })

export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(320),
  role: z.string().max(64).optional(),
  profileId: z.string().uuid(),
  status: userStatus.optional(),
  avatarUrl: entityImageUrlSchema,
  phone: z.string().max(64).optional(),
  department: z.string().max(128).optional(),
  jobTitle: z.string().max(128).optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(16).optional(),
  birthDate: birthDateSchema,
  bio: z.string().max(5000).optional(),
  password: z.string().min(8).max(128).optional(),
  sendInvite: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  guestCompanyId: z.string().uuid().nullable().optional(),
})

export const updateUserSchema = createUserSchema.partial()

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
  status: z.string().optional(),
  ...listSortAndDateQueryFields,
})
