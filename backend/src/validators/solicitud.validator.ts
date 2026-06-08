import { z } from 'zod'

const solicitudStatusSchema = z.enum([
  'Nuevo',
  'En Proceso',
  'Detenido por cliente',
  'Detenido Internamente',
  'En espera de Cliente',
  'Entregado a Cliente',
  'Planificación',
  'Cerrado',
])

const solicitudPrioritySchema = z.enum(['Baja', 'Media', 'Alta', 'Urgente'])

const teamMemberSchema = z.object({
  userId: z.string().uuid().nullish(),
  userName: z.string().min(1).optional(),
  roleLabel: z.string().max(255).nullish(),
})

export const listSolicitudesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: solicitudStatusSchema.optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})

export const createSolicitudSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(120_000).optional(),
  status: solicitudStatusSchema.optional(),
  priority: solicitudPrioritySchema.optional(),
  assigneeName: z.string().max(255).optional(),
  assigneeUserId: z.string().uuid().nullish(),
  team: z.array(teamMemberSchema).optional(),
})

export const updateSolicitudSchema = createSolicitudSchema.partial()
