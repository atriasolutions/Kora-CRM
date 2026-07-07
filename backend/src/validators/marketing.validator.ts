import { z } from 'zod'

import { isValidChilePhone } from '../lib/chile-phone.js'
import { privacyConsentSchema } from './privacy.validator.js'

const trialLeadFields = z.object({
  name: z.string().min(1).max(255),
  company: z.string().min(1).max(255),
  rut: z.string().min(1).max(32),
  employees: z.string().min(1).max(32),
  address: z.string().min(1).max(500),
  region: z.string().min(1).max(255),
  commune: z.string().min(1).max(255),
  email: z.string().trim().email('Correo electrónico inválido.').max(320),
  phone: z
    .string()
    .trim()
    .min(1, 'El teléfono es obligatorio.')
    .max(64)
    .refine(isValidChilePhone, 'Teléfono chileno inválido (ej. +56 9 8765 4321).'),
  message: z.string().max(5000).optional(),
})

export const trialLeadSchema = trialLeadFields.merge(privacyConsentSchema)

export type TrialLeadInput = z.infer<typeof trialLeadSchema>

const supportRequestFields = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(320),
  company: z.string().max(255).optional(),
  topic: z.enum(['technical', 'access', 'usage', 'billing', 'other']),
  message: z.string().min(10).max(5000),
})

export const supportRequestSchema = supportRequestFields.merge(privacyConsentSchema)

export type SupportRequestInput = z.infer<typeof supportRequestSchema>
