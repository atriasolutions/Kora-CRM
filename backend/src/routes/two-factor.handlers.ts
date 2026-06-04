import type { Request, Response, NextFunction } from 'express'

import { getAuditActor } from '../middleware/audit-actor.js'
import { assertCanManageUser2fa } from '../middleware/can-manage-user-2fa.js'
import { badRequest } from '../middleware/errors.js'
import { pool } from '../db/pool.js'
import * as authRepo from '../repositories/auth.repository.js'
import * as twoFactorRepo from '../repositories/two-factor.repository.js'
import * as twoFactorAuth from '../services/two-factor-auth.service.js'
import { getClientIp } from '../utils/client-request.js'
import {
  enrollmentConfirmSchema,
  totpConfirmSetupSchema,
  totpDisableSchema,
  verifyTwoFactorLoginSchema,
} from '../validators/two-factor.validator.js'

function loginClient(req: Request) {
  return {
    userAgent: req.header('user-agent') ?? undefined,
    ipAddress: getClientIp(req),
  }
}

export async function handleVerifyTwoFactorLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = verifyTwoFactorLoginSchema.parse(req.body)
    const userId = await twoFactorAuth.verifyLoginChallenge(
      body.challengeId,
      body.code,
    )
    const result = await authRepo.createAuthSessionForUser(userId, loginClient(req))
    res.json({
      data: {
        token: result.token,
        user: result.user,
        profile: result.profile,
      },
    })
  } catch (e) {
    next(e)
  }
}

export async function handleEnrollmentSetup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const enrollmentToken = String(req.body?.enrollmentToken ?? '').trim()
    if (!enrollmentToken) throw badRequest('Falta el token de configuración.')
    const userId = await twoFactorRepo.resolveEnrollmentSession(enrollmentToken)
    if (!userId) {
      throw badRequest('La sesión de configuración expiró. Inicia sesión de nuevo.')
    }
    const setup = await twoFactorAuth.startTotpSetupForUser(userId)
    res.json({ data: { ...setup, enrollmentToken } })
  } catch (e) {
    next(e)
  }
}

export async function handleEnrollmentConfirm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = enrollmentConfirmSchema.parse(req.body)
    const { userId, backupCodes } = await twoFactorAuth.verifyEnrollmentAndResolveUser(
      body.enrollmentToken,
      body.code,
      body.setupId,
    )
    const result = await authRepo.createAuthSessionForUser(userId, loginClient(req))
    res.json({
      data: {
        token: result.token,
        user: result.user,
        profile: result.profile,
        backupCodes,
      },
    })
  } catch (e) {
    next(e)
  }
}

export async function handleTwoFactorStatus(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUserId: string,
): Promise<void> {
  try {
    assertCanManageUser2fa(req, targetUserId)
    const status = await twoFactorAuth.getTwoFactorStatus(targetUserId)
    res.json({ data: status })
  } catch (e) {
    next(e)
  }
}

export async function handleTwoFactorSetup(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUserId: string,
): Promise<void> {
  try {
    assertCanManageUser2fa(req, targetUserId)
    const setup = await twoFactorAuth.startTotpSetupForUser(targetUserId)
    res.json({ data: setup })
  } catch (e) {
    next(e)
  }
}

export async function handleTwoFactorConfirm(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUserId: string,
): Promise<void> {
  try {
    assertCanManageUser2fa(req, targetUserId)
    const body = totpConfirmSetupSchema.parse(req.body)
    const { backupCodes } = await twoFactorAuth.confirmTotpSetup(
      targetUserId,
      body.code,
      body.setupId,
    )
    res.json({ data: { backupCodes, configured: true } })
  } catch (e) {
    next(e)
  }
}

export async function handleTwoFactorDisable(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUserId: string,
): Promise<void> {
  try {
    assertCanManageUser2fa(req, targetUserId)
    const body = totpDisableSchema.parse(req.body)
    const actor = getAuditActor(req)
    const isSelf = actor.userId === targetUserId

    if (isSelf) {
      const row = await pool.query<{ id: string }>(
        `SELECT id FROM crm_users
         WHERE id = $1 AND deleted_at IS NULL
           AND password_hash = crypt($2, password_hash)`,
        [targetUserId, body.password],
      )
      if (!row.rows[0]) throw badRequest('Contraseña incorrecta.')
      const ok = await twoFactorRepo.verifyUserTotpOrBackup(targetUserId, body.code)
      if (!ok) throw badRequest('Código incorrecto.')
      await twoFactorRepo.disableTotpForUser(targetUserId)
    } else {
      await twoFactorRepo.setTwoFactorPolicy(targetUserId, false)
    }
    res.json({ data: { disabled: true } })
  } catch (e) {
    next(e)
  }
}

export async function handleTwoFactorAdminReset(
  req: Request,
  res: Response,
  next: NextFunction,
  targetUserId: string,
): Promise<void> {
  try {
    const actor = getAuditActor(req)
    if (actor.userId === targetUserId) {
      throw badRequest('Usa desactivar 2FA con tu contraseña y código.')
    }
    assertCanManageUser2fa(req, targetUserId)
    await twoFactorRepo.disableTotpForUser(targetUserId)
    res.json({ data: { reset: true } })
  } catch (e) {
    next(e)
  }
}
