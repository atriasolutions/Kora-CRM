import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'

export const listPruebasSolicitudQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  q: z.string().optional(),
  solicitudId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  ...listSortAndDateQueryFields,
})

const pruebaCasoInputSchema = z.object({
  id: z.string().uuid().optional(),
  shortDescription: z.string().max(500).optional(),
  inputData: z.string().max(10000).optional(),
  steps: z.string().max(20000).optional(),
  expectedResult: z.string().max(10000).optional(),
  obtainedResult: z.string().max(10000).optional(),
  executorOk: z.boolean().nullable().optional(),
  executorNotes: z.string().max(5000).optional(),
  evidenceHtml: z.string().max(200000).optional(),
  clientOk: z.boolean().nullable().optional(),
  clientNotes: z.string().max(5000).optional(),
})

export const createPruebaSolicitudSchema = z.object({
  solicitudId: z.string().uuid(),
  description: z.string().max(5000).optional(),
  executedAt: z.string().max(32).optional(),
  cases: z.array(pruebaCasoInputSchema).max(200).optional(),
})

export const updatePruebaSolicitudSchema = z.object({
  description: z.string().max(5000).optional(),
  executedAt: z.string().max(32).nullish(),
})

export const updatePruebaCasosSchema = z.object({
  cases: z.array(pruebaCasoInputSchema).max(200),
})

export const clientReviewPruebaCasoSchema = z.object({
  clientOk: z.boolean(),
  clientNotes: z.string().max(5000).optional(),
})
