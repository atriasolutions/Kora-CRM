import { z } from 'zod'

import { isValidChilePhone } from '../lib/chile-phone.js'
import { inferStoredTaxIdKind } from '../lib/tax-id.js'

const identifierTypeSchema = z.enum(['RUT', 'DNI'])

const leadProspectFields = {
  name: z.string().min(1).max(255),
  company: z.string().min(1).max(255),
  identifierType: identifierTypeSchema.optional(),
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
}

function refineTaxId(
  data: { identifierType?: 'RUT' | 'DNI'; rut: string },
  ctx: z.RefinementCtx,
): void {
  const kind =
    data.identifierType === 'DNI'
      ? 'dni'
      : data.identifierType === 'RUT'
        ? 'rut'
        : inferStoredTaxIdKind(data.rut)
  const trimmed = data.rut.trim()
  if (!trimmed) {
    ctx.addIssue({ code: 'custom', message: 'El identificador fiscal es obligatorio.', path: ['rut'] })
    return
  }
  if (kind === 'dni') {
    if (trimmed.length < 5) {
      ctx.addIssue({ code: 'custom', message: 'El DNI debe tener al menos 5 caracteres.', path: ['rut'] })
    }
    return
  }
  const clean = trimmed.replace(/[^\dkK]/gi, '')
  if (clean.length < 8) {
    ctx.addIssue({ code: 'custom', message: 'RUT inválido o incompleto.', path: ['rut'] })
  }
}

export const integrationLeadSchema = z
  .object({
    ...leadProspectFields,
    tenantId: z.string().uuid().optional(),
    tenantSlug: z.string().trim().min(1).max(64).optional(),
    assigneeEmail: z.string().trim().email('assigneeEmail inválido.').max(320).optional(),
    externalId: z.string().trim().max(128).optional(),
  })
  .superRefine(refineTaxId)

export type IntegrationLeadInput = z.infer<typeof integrationLeadSchema>
