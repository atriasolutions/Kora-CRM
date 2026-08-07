import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

const projectStatusSchema = z.enum(['En curso', 'Completado', 'Pausado'])
const projectHealthSchema = z.enum(['En plazo', 'En riesgo', 'Retrasado'])
const projectPrioritySchema = z.enum(['Alta', 'Media', 'Baja'])

const journeyStageSchema = z.enum([
  'Nuevo',
  'En Levantamiento',
  'En Proceso',
  'Entregado a Cliente',
  'Cerrado',
  'Detenido por Cliente',
  'Detenido internamente',
  'En Espera Cliente',
])

const teamMemberSchema = z.object({
  userId: z.string().uuid().nullish(),
  userName: z.string().min(1).optional(),
  roleLabel: z.string().max(255).nullish(),
})

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  opportunityId: z.string().uuid().optional(),
  solicitudId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})

const projectCustomerKindSchema = z.enum(['contacto', 'empresa']).optional()

const workPlanGroupSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  accent: z.string().max(32).optional(),
  collapsed: z.boolean().optional(),
  order: z.number().int().min(0),
})

const workPlanItemSchema = z.object({
  id: z.string().min(1).max(128),
  groupId: z.string().min(1).max(128),
  parentId: z.string().max(128).nullable().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(8000).optional(),
  assignees: z.array(z.string().max(255)).optional(),
  status: z.string().max(64).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  estimatedStart: z.string().max(32).optional(),
  estimatedEnd: z.string().max(32).optional(),
  actualStart: z.string().max(32).optional(),
  actualEnd: z.string().max(32).optional(),
  comment: z.string().max(8000).optional(),
  order: z.number().int().min(0),
})

export const projectWorkPlanSchema = z.object({
  groups: z.array(workPlanGroupSchema),
  items: z.array(workPlanItemSchema),
})

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  client: z.string().optional(),
  customerKind: projectCustomerKindSchema,
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  acceptedQuoteId: z.string().uuid().optional(),
  solicitudId: z.string().uuid().optional(),
  progress: z.string().optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  progressNum: z.number().int().min(0).max(100).optional(),
  deadline: z.string().optional(),
  managerName: z.string().optional(),
  journeyStage: journeyStageSchema.optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  health: projectHealthSchema.optional(),
  budget: z.string().optional(),
  budgetCents: z.number().optional(),
  startDate: z.string().optional(),
  team: z.array(teamMemberSchema).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()
