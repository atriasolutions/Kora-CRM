import { Router } from 'express'

import { env } from '../config/env.js'
import { getAuditActor } from '../middleware/audit-actor.js'
import * as authRepo from '../repositories/auth.repository.js'
import {
  getTenantBySlug,
  getTenantById,
  listMembershipsForEmail,
  resolveTenantSlugFromHost,
} from '../repositories/tenants.repository.js'
import * as onboarding from '../services/user-onboarding.service.js'
import {
  handleEnrollmentConfirm,
  handleEnrollmentSetup,
  handleTwoFactorConfirm,
  handleTwoFactorDisable,
  handleTwoFactorSetup,
  handleTwoFactorStatus,
  handleVerifyTwoFactorLogin,
} from './two-factor.handlers.js'
import { getClientIp } from '../utils/client-request.js'
import { readAuthToken } from '../middleware/auth-token.js'
import {
  activateAccountSchema,
  forgotPasswordSchema,
  identifySchema,
  loginSchema,
  resetPasswordSchema,
  switchTenantSchema,
  verifyTokenQuerySchema,
} from '../validators/auth.validator.js'

export const authRouter = Router()

authRouter.get('/tenant-by-host', async (req, res, next) => {
  try {
    const host = String(req.query.host ?? req.header('host') ?? '')
    const slug =
      resolveTenantSlugFromHost(host, env.platformDomain) ??
      env.defaultTenantSlug
    const tenant = await getTenantBySlug(slug)
    if (!tenant) {
      res.status(404).json({ error: 'Empresa no encontrada' })
      return
    }
    res.json({ data: tenant })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/identify', async (req, res, next) => {
  try {
    const body = identifySchema.parse(req.body)
    const memberships = await listMembershipsForEmail(body.email)
    res.json({ data: { memberships } })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const host = req.header('x-forwarded-host') ?? req.header('host') ?? ''
    const hostSlug = resolveTenantSlugFromHost(host, env.platformDomain)
    let tenantId = body.tenantId
    if (!tenantId && hostSlug) {
      tenantId = (await getTenantBySlug(hostSlug))?.id
    }
    const step = await authRepo.loginWithEmailPassword(
      body.email,
      body.password,
      tenantId,
      {
      userAgent: req.header('user-agent') ?? undefined,
      ipAddress: getClientIp(req),
    })
    if (step.kind === 'complete') {
      res.json({
        data: {
          token: step.result.token,
          user: step.result.user,
          profile: step.result.profile,
          tenantId: step.result.tenantId,
        },
      })
      return
    }
    if (step.kind === 'verify') {
      res.json({
        data: {
          requiresTwoFactor: true,
          challengeId: step.challengeId,
          user: step.user,
          tenantId: step.tenantId,
        },
      })
      return
    }
    res.json({
      data: {
        requiresTwoFactorEnrollment: true,
        enrollmentToken: step.enrollmentToken,
        user: step.user,
        tenantId: step.tenantId,
      },
    })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/login/verify-2fa', handleVerifyTwoFactorLogin)

authRouter.post('/2fa/enrollment/setup', handleEnrollmentSetup)
authRouter.post('/2fa/enrollment/confirm', handleEnrollmentConfirm)

authRouter.get('/2fa/status', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await handleTwoFactorStatus(req, res, next, actor.userId)
  } catch (e) {
    next(e)
  }
})

authRouter.post('/2fa/setup', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await handleTwoFactorSetup(req, res, next, actor.userId)
  } catch (e) {
    next(e)
  }
})

authRouter.post('/2fa/confirm', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await handleTwoFactorConfirm(req, res, next, actor.userId)
  } catch (e) {
    next(e)
  }
})

authRouter.post('/2fa/disable', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    await handleTwoFactorDisable(req, res, next, actor.userId)
  } catch (e) {
    next(e)
  }
})

authRouter.post('/switch-tenant', async (req, res, next) => {
  try {
    const token = readAuthToken(req)
    if (!token) {
      res.status(401).json({ error: { message: 'Sesión requerida' } })
      return
    }
    const actor = getAuditActor(req)
    const body = switchTenantSchema.parse(req.body)
    const result = await authRepo.switchTenantSession(
      actor.userId,
      body.tenantId,
      token,
      {
        userAgent: req.header('user-agent') ?? undefined,
        ipAddress: getClientIp(req),
      },
    )
    res.json({
      data: {
        token: result.token,
        user: result.user,
        profile: result.profile,
        tenantId: result.tenantId,
      },
    })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    const token =
      req.header('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
      req.header('x-auth-token')?.trim()
    if (token) await authRepo.logoutSession(token)
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

authRouter.get('/me', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    const result = await authRepo.getUserByIdForAuth(actor.userId, actor.tenantId)
    const tenant = await getTenantById(result.tenantId)
    res.json({
      data: {
        user: result.user,
        profile: result.profile,
        tenantId: result.tenantId,
        tenantSlug: tenant?.slug ?? '',
      },
    })
  } catch (e) {
    next(e)
  }
})

authRouter.get('/permissions', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    const result = await authRepo.getUserByIdForAuth(actor.userId, actor.tenantId)
    res.json({ data: result.profile.permissions })
  } catch (e) {
    next(e)
  }
})

/** Preguntas para activación de cuenta (público). */
authRouter.get('/security-questions', async (_req, res, next) => {
  try {
    const items = await onboarding.getSecurityQuestionsForPublic()
    res.json({ data: items })
  } catch (e) {
    next(e)
  }
})

authRouter.get('/verify-token', async (req, res, next) => {
  try {
    const query = verifyTokenQuerySchema.parse(req.query)
    const result = await onboarding.validateVerificationToken(
      query.token,
      query.purpose,
    )
    res.json({ data: result })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/activate-account', async (req, res, next) => {
  try {
    const body = activateAccountSchema.parse(req.body)
    const result = await onboarding.completeAccountSetup(body)
    res.json({ data: result })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const body = forgotPasswordSchema.parse(req.body)
    const result = await onboarding.requestPasswordReset(body.email)
    res.json({ data: result })
  } catch (e) {
    next(e)
  }
})

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const body = resetPasswordSchema.parse(req.body)
    const result = await onboarding.completePasswordReset(body)
    res.json({ data: result })
  } catch (e) {
    next(e)
  }
})
