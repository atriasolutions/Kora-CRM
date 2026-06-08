import type { NextFunction, Request, Response } from 'express'

import { env } from '../config/env.js'
import {
  getUserByIdForAuth,
  resolveSessionUser,
} from '../repositories/auth.repository.js'
import {
  getTenantBySlug,
  resolveTenantSlugFromHost,
} from '../repositories/tenants.repository.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import type { AccessProfile } from '../types/access-profile.js'
import type { AuditActor } from '../types/audit.js'
import { unauthorized } from './errors.js'
import { readAuthToken } from './auth-token.js'

export type RequestWithAuth = Request & {
  auditActor: AuditActor
  authProfile: AccessProfile
  tenantId?: string
  tenantSlug?: string
}

export function getAuthProfile(req: Request): AccessProfile | undefined {
  return (req as RequestWithAuth).authProfile
}

export function getRequestTenantId(req: Request): string | undefined {
  return (req as RequestWithAuth).tenantId
}

async function resolveHostTenant(req: Request): Promise<{ tenantId?: string; slug?: string }> {
  const host = req.header('x-forwarded-host') ?? req.header('host') ?? ''
  const slug = resolveTenantSlugFromHost(host, env.platformDomain)
  if (!slug) return {}
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return {}
  return { tenantId: tenant.id, slug: tenant.slug }
}

/** Carga sesión y perfil; exige token válido si el cliente envió Authorization. */
export async function authSessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const r = req as RequestWithAuth
  const token = readAuthToken(req)
  const hostTenant = await resolveHostTenant(req)

  const finish = async () => {
    if (token) {
      const session = await resolveSessionUser(token)
      if (session) {
        if (
          hostTenant.tenantId &&
          hostTenant.tenantId !== session.tenantId
        ) {
          next(unauthorized('Esta sesión no corresponde a la empresa de este subdominio.'))
          return
        }
        r.tenantId = session.tenantId
        r.tenantSlug = hostTenant.slug
        r.auditActor = {
          userId: session.user.id,
          userName: session.user.name,
          tenantId: session.tenantId,
        }
        r.authProfile = session.profile
        await runWithTenantAsync(
          { tenantId: session.tenantId, tenantSlug: hostTenant.slug },
          async () => next(),
        )
        return
      }
      // Token presente pero inválido/caducado: continuar como anónimo (marketing, login, etc.).
    }

    if (env.nodeEnv === 'production') {
      next()
      return
    }

    const fallbackTenantId =
      hostTenant.tenantId ??
      (await getTenantBySlug(env.defaultTenantSlug))?.id ??
      ATRIA_TENANT_ID

    try {
      const fallback = await getUserByIdForAuth(env.demoUserId, fallbackTenantId)
      r.tenantId = fallbackTenantId
      r.tenantSlug = hostTenant.slug
      r.auditActor = {
        userId: fallback.user.id,
        userName: fallback.user.name,
        tenantId: fallbackTenantId,
      }
      r.authProfile = fallback.profile
      await runWithTenantAsync(
        { tenantId: fallbackTenantId, tenantSlug: hostTenant.slug },
        async () => next(),
      )
    } catch (e) {
      next(e)
    }
  }

  void finish()
}
