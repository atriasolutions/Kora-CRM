import { z } from 'zod'

const totpCodeSchema = z.string().min(6).max(16)

export const verifyTwoFactorLoginSchema = z.object({
  challengeId: z.string().uuid(),
  code: totpCodeSchema,
  tenantId: z.string().uuid().optional(),
})

export const enrollmentConfirmSchema = z.object({
  enrollmentToken: z.string().uuid(),
  code: totpCodeSchema,
  setupId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
})

export const totpConfirmSetupSchema = z.object({
  code: totpCodeSchema,
  setupId: z.string().uuid().optional(),
})

export const totpDisableSchema = z.object({
  code: totpCodeSchema,
  password: z.string().min(1).max(128),
})

export const adminTotpSetupSchema = z.object({
  targetUserId: z.string().uuid().optional(),
})
