import { z } from 'zod'

import { listSortAndDateQueryFields } from '../lib/list-query.js'
import {
  WORKER_CONTRACT_TYPES,
  WORKER_STATUSES,
  WORKER_VACATION_STATUSES,
} from '../types/worker.js'

const workerStatusSchema = z.enum(WORKER_STATUSES)
const contractTypeSchema = z.enum(WORKER_CONTRACT_TYPES)
const vacationStatusSchema = z.enum(WORKER_VACATION_STATUSES)

export const listWorkersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  contractType: z.string().optional(),
  businessUnit: z.string().optional(),
  ownerName: z.string().max(255).optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  ...listSortAndDateQueryFields,
})

const workerBaseFields = {
  number: z.string().max(64).optional(),
  fullName: z.string().max(255).optional(),
  taxId: z.string().max(32).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(64).optional(),
  address: z.string().max(255).optional(),
  avatarUrl: z.string().max(4096).optional(),
  jobTitle: z.string().max(255).optional(),
  businessUnit: z.string().max(255).optional(),
  jobFunctions: z.string().max(4000).optional(),
  status: workerStatusSchema.optional(),
  contractType: contractTypeSchema.optional(),
  workHours: z.number().int().min(0).max(45).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  baseSalary: z.string().optional(),
  baseSalaryCents: z.number().optional(),
  baseSalaryNum: z.number().optional(),
  gratification: z.string().optional(),
  gratificationCents: z.number().optional(),
  gratificationNum: z.number().optional(),
  afpName: z.string().max(128).optional(),
  afpRate: z.number().min(0).max(100).optional(),
  healthInstitution: z.string().max(128).optional(),
  healthPlan: z.string().max(128).optional(),
  afcRate: z.number().min(0).max(100).optional(),
  vacationAdjustmentDays: z.number().min(-999).max(999).optional(),
  paydayDay: z.number().int().min(1).max(28).optional(),
  ownerName: z.string().max(255).optional(),
} as const

export const createWorkerSchema = z
  .object(workerBaseFields)
  .superRefine((data, ctx) => {
    if (!data.fullName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indica el nombre del trabajador.',
        path: ['fullName'],
      })
    }
  })

export const updateWorkerSchema = z.object(workerBaseFields)

export const createVacationSchema = z.object({
  startDate: z.string().min(1, 'Indica la fecha de inicio.'),
  endDate: z.string().min(1, 'Indica la fecha de término.'),
  days: z.number().min(0).max(365).optional(),
  status: vacationStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
})

export const updateVacationSchema = z.object({
  status: vacationStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
})

export const createPayrollSchema = z.object({
  periodYear: z.number().int().min(2000).max(2100).optional(),
  periodMonth: z.number().int().min(1).max(12).optional(),
  daysWorked: z.number().min(0).max(31).optional(),
  daysLicense: z.number().min(0).max(31).optional(),
  daysAbsence: z.number().min(0).max(31).optional(),
  daysVacation: z.number().min(0).max(31).optional(),
  ufValueCents: z.number().int().min(0).optional(),
  incomeTaxCents: z.number().int().min(0).optional(),
  extraTaxableCents: z.number().int().min(0).optional(),
  nonTaxableCents: z.number().int().min(0).optional(),
  paid: z.boolean().optional(),
})
