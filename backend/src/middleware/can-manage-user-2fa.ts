import type { Request } from 'express'

import { canModulePermission } from '../lib/permissions.js'
import { getAuditActor } from './audit-actor.js'
import { getAuthProfile } from './auth-session.js'
import { forbidden } from './errors.js'

export function assertCanManageUser2fa(req: Request, targetUserId: string): void {
  const actor = getAuditActor(req)
  if (actor.userId === targetUserId) return
  const profile = getAuthProfile(req)
  if (!canModulePermission(profile, 'usuarios', 'edit')) {
    throw forbidden('No tienes permiso para gestionar 2FA de este usuario.')
  }
}
