import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
  tenantId: z.string().uuid().optional(),
})

export const identifySchema = z.object({
  email: z.string().email().max(320),
})

export const switchTenantSchema = z.object({
  tenantId: z.string().uuid(),
})

export const verifyTokenQuerySchema = z.object({
  token: z.string().min(16).max(128),
  purpose: z.enum(['account_setup', 'password_reset']),
})

export const activateAccountSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
  questionId: z.string().uuid(),
  securityAnswer: z.string().min(2).max(255),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(320),
})
