import { z } from 'zod'

const privacyRequestType = z.enum([
  'acceso',
  'rectificacion',
  'supresion',
  'oposicion',
  'portabilidad',
  'bloqueo',
])

const privacyRequestStatus = z.enum([
  'pendiente',
  'en_proceso',
  'completada',
  'rechazada',
  'prorrogada',
])

const contactLegalBasis = z.enum([
  'consentimiento',
  'contrato',
  'interes_legitimo',
  'obligacion_legal',
  'interes_vital',
  'datos_economicos',
])

export const createPrivacyRequestSchema = z.object({
  requestType: privacyRequestType,
  subjectName: z.string().min(1).max(255),
  subjectEmail: z.string().trim().email().max(320),
  subjectRut: z.string().max(32).optional(),
  contactId: z.string().uuid().optional(),
  channel: z.string().max(64).optional(),
  description: z.string().max(10000).optional(),
})

export const updatePrivacyRequestSchema = z.object({
  status: privacyRequestStatus.optional(),
  responseNotes: z.string().max(10000).optional(),
  rejectionReason: z.string().max(5000).optional(),
  extendDeadline: z.boolean().optional(),
})

export const createSecurityIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(10).max(20000),
  severity: z.enum(['bajo', 'medio', 'alto', 'critico']).optional(),
  dataCategories: z.string().max(2000).optional(),
  affectedCountEstimate: z.coerce.number().int().min(0).optional(),
  measuresTaken: z.string().max(10000).optional(),
})

export const updateSecurityIncidentSchema = createSecurityIncidentSchema
  .partial()
  .extend({
    status: z.enum(['abierto', 'en_investigacion', 'notificado', 'cerrado']).optional(),
    notifiedApdpAt: z.string().datetime().nullable().optional(),
    notifiedSubjectsAt: z.string().datetime().nullable().optional(),
  })

export const privacyConsentSchema = z.object({
  privacyConsentAccepted: z.literal(true, {
    errorMap: () => ({
      message: 'Debes aceptar la política de tratamiento de datos personales.',
    }),
  }),
  privacyPolicyVersion: z.string().max(32).optional(),
})

export const contactLegalBasisSchema = contactLegalBasis
