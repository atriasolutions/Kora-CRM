import { z } from 'zod'

const scheduleSchema = z.enum(['Diario', 'Semanal', 'Mensual', 'Trimestral', 'Manual'])

const templateIdSchema = z.enum([
  'tabla-dinamica',
  'nps-clientes',
  'generic',
  'estados-financieros',
])

const tableConfigSchema = z
  .object({
    dataSource: z.string().optional(),
    joinId: z.string().optional(),
    columnIds: z.array(z.string()).optional(),
    conditions: z.array(z.any()).optional(),
    combineMode: z.string().optional(),
    customExpression: z.string().optional(),
    reportTypeLabel: z.string().optional(),
  })
  .passthrough()

export const createReportFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable(),
})

export const updateReportFolderSchema = z.object({
  name: z.string().min(1).max(255),
})

export const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  folderId: z.string().uuid(),
  reportType: z.string().min(1).max(128),
  author: z.string().optional(),
  lastRun: z.string().optional(),
  schedule: scheduleSchema,
  description: z.string().optional(),
  templateId: templateIdSchema.optional(),
  tableConfig: tableConfigSchema.optional(),
})

export const updateReportSchema = createReportSchema.partial()

export const executeReportTableSchema = z.object({
  tableConfig: tableConfigSchema,
})
