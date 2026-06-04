import { pool } from '../db/pool.js'
import { mapUserDetail, mapUserRow, type UserRow } from '../mappers/user.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import { listRecentUserSessions } from './user-sessions.repository.js'
import { propagateUserDisplayName, reconcileUserDenormalizedNames } from '../services/user-name-propagate.service.js'
import * as twoFactorRepo from './two-factor.repository.js'
import { sendAccountSetupInvite } from '../services/user-onboarding.service.js'
import type { AuditActor } from '../types/audit.js'
import type { CreateUserInput, UpdateUserInput, UserDetail, UserListItem } from '../types/user.js'
import { paginationOffset } from '../utils/pagination.js'

const SELECT_COLUMNS = `
  id, email, name, role, profile_id, status, avatar_url,
  phone, department, job_title, timezone, language,
  two_factor_enabled, totp_secret_encrypted, totp_verified_at,
  bio, last_login_at, created_at
`

export type ListUsersParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
}

export async function listUsers(
  params: ListUsersParams,
): Promise<{ items: UserListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.status) {
    conditions.push(`status = $${idx++}`)
    values.push(params.status)
  }
  if (params.q) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR role ILIKE $${idx})`)
    values.push(`%${params.q}%`)
    idx++
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_users ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await pool.query<UserRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_users
     ${where}
     ORDER BY name ASC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return { items: result.rows.map(mapUserRow), total }
}

/** Directorio mínimo para asignar responsables (sin permiso al módulo Usuarios). */
export async function listUsersForAssignee(): Promise<UserListItem[]> {
  const result = await pool.query<UserRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_users
     WHERE deleted_at IS NULL AND status = 'Activo'
     ORDER BY name ASC`,
  )
  return result.rows.map(mapUserRow)
}

export async function getUserById(id: string): Promise<UserDetail> {
  const result = await pool.query<UserRow>(
    `SELECT ${SELECT_COLUMNS} FROM crm_users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Usuario no encontrado')
  const user = mapUserDetail(row)
  user.recentSessions = await listRecentUserSessions(id)
  void reconcileUserDenormalizedNames(id).catch(() => {
    /* no bloquear detalle si falla la reconciliación */
  })
  return user
}

export async function createUser(
  input: CreateUserInput,
  actor: AuditActor,
): Promise<UserDetail> {
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')
  if (!input.email?.trim()) throw badRequest('El correo es obligatorio')
  if (!input.profileId?.trim()) throw badRequest('El perfil es obligatorio')

  const password = input.password?.trim()
  const sendInvite = input.sendInvite !== false
  const status =
    input.status ??
    (password ? 'Invitado' : 'Por verificar')

  const result = password
    ? await pool.query<{ id: string }>(
        `INSERT INTO crm_users (
          email, name, password_hash, role, profile_id, status, avatar_url,
          phone, department, job_title, timezone, language, bio,
          created_by_id, created_by_name, updated_by_id, updated_by_name
        ) VALUES (
          lower($1), $2, crypt($3, gen_salt('bf')), $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $14, $15
        ) RETURNING id`,
        [
          input.email.trim(),
          input.name.trim(),
          password,
          input.role?.trim() || 'Ventas',
          input.profileId,
          status,
          input.avatarUrl?.trim() || null,
          input.phone?.trim() || null,
          input.department?.trim() || null,
          input.jobTitle?.trim() || null,
          input.timezone?.trim() || 'America/Santiago',
          input.language?.trim() || 'es',
          input.bio?.trim() || null,
          actor.userId,
          actor.userName,
        ],
      )
    : await pool.query<{ id: string }>(
        `INSERT INTO crm_users (
          email, name, password_hash, role, profile_id, status, avatar_url,
          phone, department, job_title, timezone, language, bio,
          created_by_id, created_by_name, updated_by_id, updated_by_name
        ) VALUES (
          lower($1), $2, NULL, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $13, $14
        ) RETURNING id`,
        [
          input.email.trim(),
          input.name.trim(),
          input.role?.trim() || 'Ventas',
          input.profileId,
          status,
          input.avatarUrl?.trim() || null,
          input.phone?.trim() || null,
          input.department?.trim() || null,
          input.jobTitle?.trim() || null,
          input.timezone?.trim() || 'America/Santiago',
          input.language?.trim() || 'es',
          input.bio?.trim() || null,
          actor.userId,
          actor.userName,
        ],
      )

  const userId = result.rows[0]!.id
  if (!password && sendInvite) {
    await sendAccountSetupInvite(userId)
  }
  return getUserById(userId)
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: AuditActor,
): Promise<UserDetail> {
  const existing = await getUserById(id)

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (input.name !== undefined) {
    sets.push(`name = $${idx++}`)
    values.push(input.name.trim())
  }
  if (input.email !== undefined) {
    sets.push(`email = lower($${idx++})`)
    values.push(input.email.trim())
  }
  if (input.role !== undefined) {
    sets.push(`role = $${idx++}`)
    values.push(input.role.trim())
  }
  if (input.profileId !== undefined) {
    sets.push(`profile_id = $${idx++}`)
    values.push(input.profileId)
  }
  if (input.status !== undefined) {
    sets.push(`status = $${idx++}`)
    values.push(input.status)
  }
  if (input.avatarUrl !== undefined) {
    sets.push(`avatar_url = $${idx++}`)
    values.push(input.avatarUrl.trim() || null)
  }
  if (input.phone !== undefined) {
    sets.push(`phone = $${idx++}`)
    values.push(input.phone.trim() || null)
  }
  if (input.department !== undefined) {
    sets.push(`department = $${idx++}`)
    values.push(input.department.trim() || null)
  }
  if (input.jobTitle !== undefined) {
    sets.push(`job_title = $${idx++}`)
    values.push(input.jobTitle.trim() || null)
  }
  if (input.timezone !== undefined) {
    sets.push(`timezone = $${idx++}`)
    values.push(input.timezone.trim())
  }
  if (input.language !== undefined) {
    sets.push(`language = $${idx++}`)
    values.push(input.language.trim())
  }
  if (input.bio !== undefined) {
    sets.push(`bio = $${idx++}`)
    values.push(input.bio.trim() || null)
  }
  if (input.password?.trim()) {
    sets.push(`password_hash = crypt($${idx++}, gen_salt('bf'))`)
    values.push(input.password.trim())
  }

  if (input.twoFactorEnabled !== undefined) {
    if (input.twoFactorEnabled) {
      sets.push(`two_factor_enabled = $${idx++}`)
      values.push(true)
    } else {
      await twoFactorRepo.disableTotpForUser(id)
    }
  }

  if (sets.length === 0) {
    if (input.twoFactorEnabled === false) return getUserById(id)
    return getUserById(id)
  }

  sets.push(`updated_by_id = $${idx++}`)
  values.push(actor.userId)
  sets.push(`updated_by_name = $${idx++}`)
  values.push(actor.userName)
  values.push(id)

  await pool.query(
    `UPDATE crm_users SET ${sets.join(', ')}, updated_at = now()
     WHERE id = $${idx} AND deleted_at IS NULL`,
    values,
  )

  if (input.name !== undefined && input.name.trim() !== existing.name) {
    await propagateUserDisplayName(id, input.name.trim(), existing.name)
  } else {
    await reconcileUserDenormalizedNames(id)
  }

  return getUserById(id)
}

export async function softDeleteUser(id: string, actor: AuditActor): Promise<void> {
  const result = await pool.query(
    `UPDATE crm_users
     SET deleted_at = now(), deleted_by_id = $2, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, actor.userId, actor.userName],
  )
  if (result.rowCount === 0) throw notFound('Usuario no encontrado')
}
