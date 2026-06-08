import { z } from 'zod'

const relatedTypeSchema = z.enum([
  'contacto',
  'empresa',
  'oportunidad',
  'cotizacion',
  'compra',
  'factura',
  'proyecto',
  'solicitud',
  'ingreso',
  'producto',
  'inventario',
])

const activityStatusSchema = z.enum(['Pendiente', 'En curso', 'Completada', 'Vencida'])

const activityTypeSchema = z.enum(['llamada', 'email', 'reunion', 'nota', 'whatsapp'])

const prioritySchema = z.enum(['Alta', 'Media', 'Baja'])

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  relatedType: relatedTypeSchema.optional(),
  relatedId: z.string().uuid().optional(),
  assigneeName: z.string().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})

export const createActivitySchema = z.object({
  title: z.string().min(1).max(255),
  type: activityTypeSchema,
  relatedType: relatedTypeSchema,
  relatedId: z.string().uuid(),
  relatedName: z.string().optional(),
  companyName: z.string().optional(),
  scheduledAt: z.string().optional(),
  dueAt: z.string().optional(),
  assigneeName: z.string().optional(),
  status: activityStatusSchema.optional(),
  priority: prioritySchema.optional(),
  reminderAt: z.string().optional(),
  reminder: z.string().optional(),
})

export const updateActivitySchema = createActivitySchema.partial()
