import { randomUUID } from 'node:crypto'

import { platformQuery } from '../db/tenant-query.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { mapUserDetail, type UserRow } from '../mappers/user.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import { getAccessProfileById } from './access-profiles.repository.js'
import * as twoFactorRepo from './two-factor.repository.js'
import {
  getDefaultTenantIdForUser,
  resolveTenantAccess,
} from './tenants.repository.js'
import { listRecentUserSessions, recordUserSession } from './user-sessions.repository.js'
import type { AccessProfile } from '../types/access-profile.js'
import type { UserDetail } from '../types/user.js'
import { toInetOrNull } from '../utils/client-request.js'

const USER_COLUMNS = `
  id, email, name, role, profile_id, status, avatar_url,
  phone, department, job_title, timezone, language,
  two_factor_enabled, totp_secret_encrypted, totp_verified_at,
  bio, last_login_at, created_at
`

export type AuthLoginResult = {
  token: string
  user: UserDetail
  profile: AccessProfile
  tenantId: string
  isPlatformOperator: boolean
}

export type AuthLoginStepUser = {
  id: string
  email: string
  name: string
}

export type AuthLoginRequiresTwoFactor = {
  kind: 'verify'
  challengeId: string
  user: AuthLoginStepUser
  tenantId: string
}

export type AuthLoginRequiresEnrollment = {
  kind: 'enroll'
  enrollmentToken: string
  user: AuthLoginStepUser
  tenantId: string
}

export type AuthLoginStepResult =
  | { kind: 'complete'; result: AuthLoginResult }
  | AuthLoginRequiresTwoFactor
  | AuthLoginRequiresEnrollment

export type LoginClientInfo = {
  userAgent?: string
  ipAddress?: string
}

async function findUserRowByCredentials(
  email: string,
  password: string,
): Promise<UserRow> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) throw badRequest('Indica tu correo electrónico')
  if (!password) throw badRequest('Indica tu contraseña')

  const result = await platformQuery<UserRow>(
    `SELECT ${USER_COLUMNS}
     FROM crm_users
     WHERE lower(email) = $1
       AND deleted_at IS NULL
       AND password_hash = crypt($2, password_hash)`,
    [normalized, password],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Correo o contraseña incorrectos')
  if (row.status !== 'Activo') {
    const msg =
      row.status === 'Por verificar' || row.status === 'Invitado'
        ? 'Tu cuenta está pendiente de activación. Revisa tu correo o pide una nueva invitación.'
        : row.status === 'Inactivo'
          ? 'Tu cuenta está inactiva.'
          : 'Tu cuenta no está activa.'
    throw badRequest(msg)
  }
  return row
}

async function resolveTenantForLogin(
  userId: string,
  tenantId?: string,
): Promise<{ tenantId: string; profileId: string; isPlatformOperator: boolean }> {
  const resolvedTenantId = tenantId?.trim() || (await getDefaultTenantIdForUser(userId))
  const access = await resolveTenantAccess(userId, resolvedTenantId)
  return {
    tenantId: resolvedTenantId,
    profileId: access.profileId,
    isPlatformOperator: access.isPlatformOperator,
  }
}

export async function createAuthSessionForUser(
  userId: string,
  tenantId: string,
  client?: LoginClientInfo,
): Promise<AuthLoginResult> {
  return runWithTenantAsync({ tenantId }, async () => {
    const { profileId, isPlatformOperator } = await resolveTenantAccess(userId, tenantId)

    const result = await platformQuery<UserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    )
    const row = result.rows[0]
    if (!row || row.status !== 'Activo') {
      throw badRequest('Tu cuenta no está activa.')
    }

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await platformQuery(
      `INSERT INTO crm_user_auth_sessions (user_id, token_hash, expires_at, user_agent, ip_address, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        row.id,
        token,
        expiresAt,
        client?.userAgent?.trim() || null,
        toInetOrNull(client?.ipAddress),
        tenantId,
      ],
    )

    await platformQuery(`UPDATE crm_users SET last_login_at = now() WHERE id = $1`, [row.id])

    await recordUserSession({
      userId: row.id,
      userAgent: client?.userAgent,
      ipAddress: client?.ipAddress,
    })

    const user = mapUserDetail({ ...row, last_login_at: new Date(), profile_id: profileId })
    user.profileId = profileId
    user.recentSessions = await listRecentUserSessions(row.id)
    const profile = await getAccessProfileById(profileId)

    return { token, user, profile, tenantId, isPlatformOperator }
  })
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  tenantId?: string,
  client?: LoginClientInfo,
): Promise<AuthLoginStepResult> {
  const row = await findUserRowByCredentials(email, password)
  const resolved = await resolveTenantForLogin(row.id, tenantId)
  const stepUser: AuthLoginStepUser = {
    id: row.id,
    email: row.email,
    name: row.name,
  }

  const totpRow = await twoFactorRepo.getTotpUserRow(row.id)
  const configured = twoFactorRepo.isTotpConfigured(totpRow)

  if (totpRow.two_factor_enabled && configured) {
    const challengeId = await twoFactorRepo.createLoginChallenge(row.id)
    return { kind: 'verify', challengeId, user: stepUser, tenantId: resolved.tenantId }
  }

  if (totpRow.two_factor_enabled && !configured) {
    const enrollmentToken = await twoFactorRepo.createEnrollmentSession(row.id)
    return {
      kind: 'enroll',
      enrollmentToken,
      user: stepUser,
      tenantId: resolved.tenantId,
    }
  }

  const result = await createAuthSessionForUser(row.id, resolved.tenantId, client)
  return { kind: 'complete', result }
}

export async function loginWithEmailPasswordLegacy(
  email: string,
  password: string,
  tenantId?: string,
  client?: LoginClientInfo,
): Promise<AuthLoginResult> {
  const step = await loginWithEmailPassword(email, password, tenantId, client)
  if (step.kind !== 'complete') {
    throw badRequest('Se requiere verificación en dos pasos.')
  }
  return step.result
}

export async function resolveSessionUser(token: string): Promise<{
  user: UserDetail
  profile: AccessProfile
  tenantId: string
  isPlatformOperator: boolean
} | null> {
  const trimmed = token.trim()
  if (!trimmed) return null

  const session = await platformQuery<{ user_id: string; tenant_id: string | null }>(
    `SELECT user_id, tenant_id FROM crm_user_auth_sessions
     WHERE token_hash = $1 AND expires_at > now()
     LIMIT 1`,
    [trimmed],
  )
  const userId = session.rows[0]?.user_id
  if (!userId) return null

  let tenantId = session.rows[0]?.tenant_id?.trim() ?? ''
  if (!tenantId) {
    try {
      tenantId = await getDefaultTenantIdForUser(userId)
      await platformQuery(
        `UPDATE crm_user_auth_sessions SET tenant_id = $2 WHERE token_hash = $1`,
        [trimmed, tenantId],
      )
    } catch {
      return null
    }
  }

  const { profileId, isPlatformOperator } = await resolveTenantAccess(userId, tenantId)

  return runWithTenantAsync({ tenantId }, async () => {
    const result = await platformQuery<UserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    )
    const row = result.rows[0]
    if (!row || row.status !== 'Activo') return null

    const user = mapUserDetail(row)
    user.profileId = profileId
    const profile = await getAccessProfileById(profileId)
    return { user, profile, tenantId, isPlatformOperator }
  })
}

export async function logoutSession(token: string): Promise<void> {
  await platformQuery(`DELETE FROM crm_user_auth_sessions WHERE token_hash = $1`, [
    token.trim(),
  ])
}

export async function switchTenantSession(
  userId: string,
  tenantId: string,
  currentToken: string,
  client?: LoginClientInfo,
): Promise<AuthLoginResult> {
  await resolveTenantAccess(userId, tenantId)
  await logoutSession(currentToken)
  return createAuthSessionForUser(userId, tenantId, client)
}

export async function getUserByIdForAuth(
  id: string,
  tenantId: string,
): Promise<{
  user: UserDetail
  profile: AccessProfile
  tenantId: string
  isPlatformOperator: boolean
}> {
  return runWithTenantAsync({ tenantId }, async () => {
    const { profileId, isPlatformOperator } = await resolveTenantAccess(id, tenantId)
    const result = await platformQuery<UserRow>(
      `SELECT ${USER_COLUMNS} FROM crm_users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Usuario no encontrado')
    const user = mapUserDetail(row)
    user.profileId = profileId
    const profile = await getAccessProfileById(profileId)
    return { user, profile, tenantId, isPlatformOperator }
  })
}
