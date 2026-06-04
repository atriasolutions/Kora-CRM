import {
  buildOtpAuthUri,
  generateTotpSecret,
  qrDataUrlForOtpAuth,
} from './totp.service.js'
import * as twoFactorRepo from '../repositories/two-factor.repository.js'
import { badRequest } from '../middleware/errors.js'

export type TotpSetupStartResult = {
  setupId: string
  otpauthUrl: string
  qrDataUrl: string
  secret: string
}

export async function startTotpSetupForUser(userId: string): Promise<TotpSetupStartResult> {
  const row = await twoFactorRepo.getTotpUserRow(userId)
  const secret = generateTotpSecret()
  const setupId = await twoFactorRepo.startPendingSetup(userId, secret)
  const otpauthUrl = buildOtpAuthUri(row.email, secret)
  const qrDataUrl = await qrDataUrlForOtpAuth(otpauthUrl)
  return { setupId, otpauthUrl, qrDataUrl, secret }
}

export async function getTwoFactorStatus(userId: string) {
  const row = await twoFactorRepo.getTotpUserRow(userId)
  const configured = twoFactorRepo.isTotpConfigured(row)
  return {
    policyEnabled: row.two_factor_enabled,
    configured,
    required: row.two_factor_enabled,
    pendingEnrollment: row.two_factor_enabled && !configured,
  }
}

export async function confirmTotpSetup(
  userId: string,
  code: string,
  setupId?: string,
): Promise<{ backupCodes: string[] }> {
  const backupCodes = await twoFactorRepo.confirmTotpSetup(userId, code, setupId)
  return { backupCodes }
}

export async function verifyLoginChallenge(
  challengeId: string,
  code: string,
): Promise<string> {
  const userId = await twoFactorRepo.resolveLoginChallenge(challengeId)
  if (!userId) {
    throw badRequest('La sesión de verificación expiró. Inicia sesión de nuevo.')
  }
  const ok = await twoFactorRepo.verifyUserTotpOrBackup(userId, code)
  if (!ok) {
    throw badRequest('Código incorrecto. Revisa tu app autenticadora e inténtalo de nuevo.')
  }
  await twoFactorRepo.deleteLoginChallenge(challengeId)
  return userId
}

export async function verifyEnrollmentAndResolveUser(
  enrollmentToken: string,
  code: string,
  setupId?: string,
): Promise<{ userId: string; backupCodes: string[] }> {
  const userId = await twoFactorRepo.resolveEnrollmentSession(enrollmentToken)
  if (!userId) {
    throw badRequest('La sesión de configuración expiró. Inicia sesión de nuevo.')
  }
  const backupCodes = await twoFactorRepo.confirmTotpSetup(userId, code, setupId)
  await twoFactorRepo.clearEnrollmentSession(enrollmentToken)
  return { userId, backupCodes }
}
