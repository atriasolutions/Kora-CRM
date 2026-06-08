import { z } from 'zod'

export const trialLeadSchema = z.object({
  name: z.string().min(1).max(255),
  company: z.string().min(1).max(255),
  rut: z.string().min(1).max(32),
  employees: z.string().min(1).max(32),
  address: z.string().min(1).max(500),
  region: z.string().min(1).max(255),
  commune: z.string().min(1).max(255),
  email: z.string().email().max(320),
  phone: z.string().min(1).max(64),
  message: z.string().max(5000).optional(),
})

export type TrialLeadInput = z.infer<typeof trialLeadSchema>

export const supportRequestSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(320),
  company: z.string().max(255).optional(),
  topic: z.enum(['technical', 'access', 'usage', 'billing', 'other']),
  message: z.string().min(10).max(5000),
})

export type SupportRequestInput = z.infer<typeof supportRequestSchema>
