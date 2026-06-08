import { z } from 'zod'

export const siiEnvSchema = z.enum(['certification', 'production'])

export const uploadSiiCredentialSchema = z.object({
  env: siiEnvSchema.default('certification'),
  label: z.string().max(128).optional(),
  certBase64: z.string().min(1),
  certPassword: z.string().min(1),
  portalRut: z.string().max(32).optional(),
  portalPassword: z.string().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar la delegación de credenciales.' }),
  }),
})

export const syncRcvSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  type: z.enum(['issued', 'received']),
  env: siiEnvSchema.optional(),
})

export const listRcvQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(['issued', 'received']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export const uploadCafSchema = z.object({
  dteType: z.number().int().min(33).max(112),
  cafXml: z.string().min(1),
  rangeStart: z.number().int().positive().optional(),
  rangeEnd: z.number().int().positive().optional(),
})

export const emitSiiSchema = z.object({
  env: siiEnvSchema.optional(),
})
