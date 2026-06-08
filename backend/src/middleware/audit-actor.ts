import type { Request } from 'express'

import type { AuditActor } from '../types/audit.js'
import { getAuthProfile, type RequestWithAuth } from './auth-session.js'
import { unauthorized } from './errors.js'

export type RequestWithActor = RequestWithAuth

export function getAuditActor(req: Request): AuditActor {
  const r = req as RequestWithAuth
  const actor = r.auditActor
  if (!actor?.userId) {
    throw unauthorized('Sesión inválida o expirada. Vuelve a iniciar sesión.')
  }
  return actor
}

export { getAuthProfile }
