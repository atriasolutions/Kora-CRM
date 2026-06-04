import { z } from 'zod'

import { entityImageUrlSchema } from './image-url.schema.js'

const userStatus = z.enum(['Activo', 'Invitado', 'Inactivo', 'Por verificar'])

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
  bio: z.string().max(5000).optional(),
  password: z.string().min(8).max(128).optional(),
  sendInvite: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
})

export const updateUserSchema = createUserSchema.partial()

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
  status: userStatus.optional(),
})
