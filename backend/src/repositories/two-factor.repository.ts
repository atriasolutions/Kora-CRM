import { randomUUID } from 'node:crypto'

import { pool } from '../db/pool.js'
import { badRequest, notFound } from '../middleware/errors.js'
import {
  decryptSecretFromStorage,
  encryptSecretForStorage,
  generateBackupCodes,
  hashBackupCode,
  tryDecryptSecretFromStorage,
  verifyBackupCodeHash,
  verifyTotpCode,
} from '../services/totp.service.js'

const CHALLENGE_TTL_MS = 10 * 60 * 1000
const SETUP_TTL_MS = 15 * 60 * 1000
const ENROLLMENT_TTL_MS = 20 * 60 * 1000

export type TotpUserRow = {
  id: string
  email: string
  name: string
  two_factor_enabled: boolean
  totp_secret_encrypted: string | null
  totp_verified_at: Date | null
}

export async function getTotpUserRow(userId: string): Promise<TotpUserRow> {
  const result = await pool.query<TotpUserRow>(
    `SELECT id, email, name, two_factor_enabled,
            totp_secret_encrypted, totp_verified_at
     FROM crm_users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Usuario no encontrado')
  return row
}

export function isTotpConfigured(row: TotpUserRow): boolean {
  return Boolean(row.totp_secret_encrypted && row.totp_verified_at)
}

export async function createLoginChallenge(userId: string): Promise<string> {
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
  await pool.query(
    `INSERT INTO crm_user_totp_challenges (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [id, userId, expiresAt],
  )
  return id
}

/** Resuelve el desafío sin eliminarlo (permite reintentos si el código falla). */
export async function resolveLoginChallenge(
  challengeId: string,
): Promise<string | null> {
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM crm_user_totp_challenges
     WHERE id = $1 AND expires_at > now()`,
    [challengeId.trim()],
  )
  return result.rows[0]?.user_id ?? null
}

export async function deleteLoginChallenge(challengeId: string): Promise<void> {
  await pool.query(`DELETE FROM crm_user_totp_challenges WHERE id = $1`, [
    challengeId.trim(),
  ])
}

export async function createEnrollmentSession(userId: string): Promise<string> {
  await pool.query(
    `DELETE FROM crm_user_totp_enrollment_sessions WHERE user_id = $1`,
    [userId],
  )
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + ENROLLMENT_TTL_MS)
  await pool.query(
    `INSERT INTO crm_user_totp_enrollment_sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [id, userId, expiresAt],
  )
  return id
}

export async function resolveEnrollmentSession(
  sessionId: string,
): Promise<string | null> {
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM crm_user_totp_enrollment_sessions
     WHERE id = $1 AND expires_at > now()`,
    [sessionId.trim()],
  )
  return result.rows[0]?.user_id ?? null
}

export async function clearEnrollmentSession(sessionId: string): Promise<void> {
  await pool.query(`DELETE FROM crm_user_totp_enrollment_sessions WHERE id = $1`, [
    sessionId.trim(),
  ])
}

export async function clearEnrollmentSessionsForUser(userId: string): Promise<void> {
  await pool.query(`DELETE FROM crm_user_totp_enrollment_sessions WHERE user_id = $1`, [
    userId,
  ])
}

export async function startPendingSetup(
  userId: string,
  plainSecret: string,
): Promise<string> {
  await pool.query(`DELETE FROM crm_user_totp_pending_setup WHERE user_id = $1`, [
    userId,
  ])
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + SETUP_TTL_MS)
  await pool.query(
    `INSERT INTO crm_user_totp_pending_setup (id, user_id, secret_encrypted, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, encryptSecretForStorage(plainSecret), expiresAt],
  )
  return id
}

export async function getPendingSetupSecret(
  userId: string,
  setupId?: string,
): Promise<string | null> {
  const result = setupId
    ? await pool.query<{ secret_encrypted: string }>(
        `SELECT secret_encrypted FROM crm_user_totp_pending_setup
         WHERE id = $1 AND user_id = $2 AND expires_at > now()`,
        [setupId.trim(), userId],
      )
    : await pool.query<{ secret_encrypted: string }>(
        `SELECT secret_encrypted FROM crm_user_totp_pending_setup
         WHERE user_id = $1 AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [userId],
      )
  const enc = result.rows[0]?.secret_encrypted
  if (!enc) return null
  return decryptSecretFromStorage(enc)
}

export async function clearPendingSetup(userId: string): Promise<void> {
  await pool.query(`DELETE FROM crm_user_totp_pending_setup WHERE user_id = $1`, [
    userId,
  ])
}

export async function confirmTotpSetup(
  userId: string,
  code: string,
  setupId?: string,
): Promise<string[]> {
  const secret = await getPendingSetupSecret(userId, setupId)
  if (!secret) {
    throw badRequest('La configuración de 2FA expiró. Genera un nuevo código QR.')
  }
  if (!(await verifyTotpCode(secret, code))) {
    throw badRequest('Código incorrecto. Revisa la app autenticadora e inténtalo de nuevo.')
  }

  const backupCodes = generateBackupCodes()
  const enc = encryptSecretForStorage(secret)

  await pool.query('BEGIN')
  try {
    await pool.query(
      `UPDATE crm_users
       SET totp_secret_encrypted = $2, totp_verified_at = now(), two_factor_enabled = true
       WHERE id = $1`,
      [userId, enc],
    )
    await pool.query(`DELETE FROM crm_user_totp_backup_codes WHERE user_id = $1`, [
      userId,
    ])
    for (const plain of backupCodes) {
      await pool.query(
        `INSERT INTO crm_user_totp_backup_codes (user_id, code_hash) VALUES ($1, $2)`,
        [userId, hashBackupCode(plain)],
      )
    }
    await clearPendingSetup(userId)
    await pool.query('COMMIT')
  } catch (e) {
    await pool.query('ROLLBACK')
    throw e
  }

  return backupCodes
}

export async function verifyUserTotpOrBackup(
  userId: string,
  code: string,
): Promise<boolean> {
  const row = await getTotpUserRow(userId)
  if (!isTotpConfigured(row)) return false

  const trimmed = code.replace(/\s/g, '')
  const norm = trimmed.toUpperCase()

  // Código TOTP (6 dígitos)
  if (/^\d{6}$/.test(norm)) {
    const secret = tryDecryptSecretFromStorage(row.totp_secret_encrypted!)
    if (!secret) {
      throw badRequest(
        'No se pudo validar tu autenticador (configuración 2FA dañada). Contacta al administrador para restablecer el 2FA.',
      )
    }
    if (await verifyTotpCode(secret, norm)) return true
  }

  // Código de respaldo (8 caracteres hex, con o sin guión)
  const backupNorm = norm.replace(/-/g, '')
  if (backupNorm.length < 8) return false

  const hashes = await pool.query<{ id: string; code_hash: string }>(
    `SELECT id, code_hash FROM crm_user_totp_backup_codes
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  )
  for (const bc of hashes.rows) {
    if (verifyBackupCodeHash(backupNorm, bc.code_hash)) {
      await pool.query(
        `UPDATE crm_user_totp_backup_codes SET used_at = now() WHERE id = $1`,
        [bc.id],
      )
      return true
    }
  }
  return false
}

export async function disableTotpForUser(userId: string): Promise<void> {
  await pool.query(
    `UPDATE crm_users
     SET totp_secret_encrypted = NULL, totp_verified_at = NULL, two_factor_enabled = false
     WHERE id = $1`,
    [userId],
  )
  await pool.query(`DELETE FROM crm_user_totp_backup_codes WHERE user_id = $1`, [userId])
  await clearPendingSetup(userId)
  await clearEnrollmentSessionsForUser(userId)
}

export async function setTwoFactorPolicy(
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await pool.query(`UPDATE crm_users SET two_factor_enabled = true WHERE id = $1`, [
      userId,
    ])
    return
  }
  await disableTotpForUser(userId)
}
