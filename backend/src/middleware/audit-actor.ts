import type { Request } from 'express'

import type { AuditActor } from '../types/audit.js'
import { getAuthProfile, type RequestWithAuth } from './auth-session.js'

export type RequestWithActor = RequestWithAuth

export function getAuditActor(req: Request): AuditActor {
  const r = req as RequestWithAuth
  return r.auditActor
}

export { getAuthProfile }
