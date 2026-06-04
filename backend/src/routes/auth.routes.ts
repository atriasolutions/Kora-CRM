import { Router } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import * as authRepo from '../repositories/auth.repository.js'
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
import {
  activateAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  verifyTokenQuerySchema,
} from '../validators/auth.validator.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body)
    const step = await authRepo.loginWithEmailPassword(body.email, body.password, {
      userAgent: req.header('user-agent') ?? undefined,
      ipAddress: getClientIp(req),
    })
    if (step.kind === 'complete') {
      res.json({
        data: {
          token: step.result.token,
          user: step.result.user,
          profile: step.result.profile,
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
        },
      })
      return
    }
    res.json({
      data: {
        requiresTwoFactorEnrollment: true,
        enrollmentToken: step.enrollmentToken,
        user: step.user,
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
    const result = await authRepo.getUserByIdForAuth(actor.userId)
    res.json({ data: result })
  } catch (e) {
    next(e)
  }
})

authRouter.get('/permissions', async (req, res, next) => {
  try {
    const actor = getAuditActor(req)
    const result = await authRepo.getUserByIdForAuth(actor.userId)
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
