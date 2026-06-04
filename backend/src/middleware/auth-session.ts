import type { NextFunction, Request, Response } from 'express'

import { env } from '../config/env.js'
import {
  getUserByIdForAuth,
  resolveSessionUser,
} from '../repositories/auth.repository.js'
import type { AccessProfile } from '../types/access-profile.js'
import type { AuditActor } from '../types/audit.js'
import { unauthorized } from './errors.js'
import { readAuthToken } from './auth-token.js'

export type RequestWithAuth = Request & {
  auditActor: AuditActor
  authProfile: AccessProfile
}

export function getAuthProfile(req: Request): AccessProfile | undefined {
  return (req as RequestWithAuth).authProfile
}

/** Carga sesión y perfil; exige token válido si el cliente envió Authorization. */
export async function authSessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const r = req as RequestWithAuth
  const token = readAuthToken(req)

  if (token) {
    try {
      const session = await resolveSessionUser(token)
      if (!session) {
        next(unauthorized('Sesión inválida o expirada. Vuelve a iniciar sesión.'))
        return
      }
      r.auditActor = {
        userId: session.user.id,
        userName: session.user.name,
      }
      r.authProfile = session.profile
      next()
      return
    } catch (e) {
      next(e)
      return
    }
  }

  try {
    const fallback = await getUserByIdForAuth(env.demoUserId)
    r.auditActor = {
      userId: fallback.user.id,
      userName: fallback.user.name,
    }
    r.authProfile = fallback.profile
    next()
  } catch (e) {
    next(e)
  }
}
