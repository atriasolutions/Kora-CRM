import { platformQuery, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { USER_DIRECTORY_VISIBLE_CONDITION_U } from '../lib/user-directory.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { statusCountsTowardSeat } from '../lib/tenant-quota-modules.js'
import { enforceSeatQuota } from '../lib/tenant-quota-enforce.js'
import { mapUserDetail, mapUserRow, type UserRow } from '../mappers/user.mapper.js'
import { entityImageUrlForList } from '../utils/entity-image.js'
import {
  assertUserEmailAvailable,
  assertUserEmailNotInTenant,
  findUserByEmail,
  isUniqueViolation,
} from '../lib/user-email-uniqueness.js'
import { badRequest, conflict, notFound } from '../middleware/errors.js'
import { listRecentUserSessions } from './user-sessions.repository.js'
import { reconcileUserDenormalizedNames } from '../services/user-name-propagate.service.js'
import * as twoFactorRepo from './two-factor.repository.js'
import { sendAccountSetupInvite, sendTenantAccessGranted } from '../services/user-onboarding.service.js'
import {
  assertCanAssignGuestProfile,
  assertCanConsumeGuestQuotaForUserStatusChange,
  assertCanConsumeSeat,
  assertCanConsumeSeatForUserStatusChange,
} from '../services/tenant-quota.service.js'
import { isGuestProfileId } from '../services/default-tenant-profiles.service.js'
import { isPlatformOperator } from './tenants.repository.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateUserInput,
  TenantBirthdayItem,
  UpdateUserInput,
  UserDetail,
  UserListItem,
} from '../types/user.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'

const MEMBERSHIP_JOIN = `
  INNER JOIN crm_tenant_memberships mem
    ON mem.user_id = u.id
   AND mem.tenant_id = $1
`

const PROFILE_JOIN = `LEFT JOIN crm_access_profiles p ON p.id = mem.profile_id`

const TENANT_SCOPED_USER_COLUMNS = `
  COALESCE(NULLIF(trim(mem.display_name), ''), u.name) AS name,
  COALESCE(NULLIF(trim(mem.role), ''), u.role) AS role,
  mem.profile_id AS profile_id,
  p.name AS profile_name,
  COALESCE(NULLIF(trim(mem.phone), ''), u.phone) AS phone,
  COALESCE(NULLIF(trim(mem.department), ''), u.department) AS department,
  COALESCE(NULLIF(trim(mem.job_title), ''), u.job_title) AS job_title,
  COALESCE(NULLIF(trim(mem.bio), ''), u.bio) AS bio,
  mem.last_login_at AS last_login_at,
  mem.created_at AS created_at,
  mem.guest_company_id AS guest_company_id,
  mem.guest_company_name AS guest_company_name
`

const SELECT_DETAIL_COLUMNS = `
  u.id, u.email, u.status, u.avatar_url,
  u.timezone, u.language,
  u.birth_date::text AS birth_date,
  u.two_factor_enabled, u.totp_secret_encrypted, u.totp_verified_at,
  ${TENANT_SCOPED_USER_COLUMNS}
`

const SELECT_LIST_COLUMNS = `
  u.id, u.email, u.status, u.avatar_url,
  u.timezone, u.language,
  u.birth_date::text AS birth_date,
  u.two_factor_enabled, u.totp_secret_encrypted, u.totp_verified_at,
  ${TENANT_SCOPED_USER_COLUMNS}
`

function membershipLocalFields(input: {
  name?: string
  role?: string
  phone?: string
  department?: string
  jobTitle?: string
  bio?: string
}) {
  return {
    displayName: input.name?.trim() || null,
    role: input.role?.trim() || null,
    phone: input.phone?.trim() || null,
    department: input.department?.trim() || null,
    jobTitle: input.jobTitle?.trim() || null,
    bio: input.bio?.trim() || null,
  }
}

async function isGuestProfile(tenantId: string, profileId: string): Promise<boolean> {
  const result = await platformQuery<{ system_key: string | null }>(
    `SELECT system_key FROM crm_access_profiles
     WHERE id = $1 AND tenant_id = $2`,
    [profileId, tenantId],
  )
  return result.rows[0]?.system_key === 'guest'
}

async function resolveMembershipGuestCompany(
  tenantId: string,
  profileId: string,
  guestCompanyId: string | null | undefined,
): Promise<{ guestCompanyId: string | null; guestCompanyName: string | null }> {
  const isGuest = await isGuestProfile(tenantId, profileId)
  if (!isGuest) {
    return { guestCompanyId: null, guestCompanyName: null }
  }
  const id = guestCompanyId?.trim() || null
  if (!id) {
    return { guestCompanyId: null, guestCompanyName: null }
  }
  const company = await tenantQuery<{ id: string; name: string }>(
    `SELECT id, name FROM crm_companies
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, tenantId],
  )
  const row = company.rows[0]
  if (!row) throw badRequest('Empresa no encontrada')
  return {
    guestCompanyId: row.id,
    guestCompanyName: row.name?.trim() || '',
  }
}

export async function actorHasGuestProfile(
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await platformQuery<{ system_key: string | null }>(
    `SELECT p.system_key
     FROM crm_tenant_memberships m
     JOIN crm_access_profiles p ON p.id = m.profile_id
     WHERE m.user_id = $1 AND m.tenant_id = $2`,
    [userId, tenantId],
  )
  return result.rows[0]?.system_key === 'guest'
}

/** Usuario invitado válido como solicitante (con empresa asociada). */
export async function resolveGuestSolicitudRequester(
  userId: string,
  tenantId: string,
): Promise<{
  userId: string
  userName: string
  companyId: string
  companyName: string
}> {
  const result = await platformQuery<{
    name: string
    profile_id: string
    guest_company_id: string | null
    guest_company_name: string | null
  }>(
    `SELECT COALESCE(NULLIF(trim(mem.display_name), ''), u.name) AS name,
            mem.profile_id,
            mem.guest_company_id,
            mem.guest_company_name
     FROM crm_users u
     INNER JOIN crm_tenant_memberships mem
       ON mem.user_id = u.id AND mem.tenant_id = $2
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId, tenantId],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Usuario no encontrado')
  if (!(await isGuestProfile(tenantId, row.profile_id))) {
    throw badRequest('Solo usuarios con perfil Invitado pueden ser solicitantes')
  }
  const companyId = row.guest_company_id
  if (!companyId) {
    throw badRequest('El usuario invitado no tiene empresa asociada')
  }
  return {
    userId,
    userName: row.name?.trim() || '',
    companyId,
    companyName: row.guest_company_name?.trim() || '',
  }
}

export async function getActorGuestCompany(
  userId: string,
  tenantId: string,
): Promise<{ companyId: string | null; companyName: string }> {
  const result = await platformQuery<{
    guest_company_id: string | null
    guest_company_name: string | null
  }>(
    `SELECT guest_company_id, guest_company_name
     FROM crm_tenant_memberships
     WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  )
  const row = result.rows[0]
  return {
    companyId: row?.guest_company_id ?? null,
    companyName: row?.guest_company_name?.trim() ?? '',
  }
}

async function upsertTenantMembership(input: {
  tenantId: string
  userId: string
  profileId: string
  status: string
  isDefault: boolean
  local?: ReturnType<typeof membershipLocalFields>
  guestCompany?: { id: string | null; name: string | null }
}): Promise<void> {
  const local = input.local ?? membershipLocalFields({})
  const guest = input.guestCompany ?? { id: null, name: null }
  await platformQuery(
    `INSERT INTO crm_tenant_memberships (
       tenant_id, user_id, profile_id, status, is_default,
       display_name, role, phone, department, job_title, bio,
       guest_company_id, guest_company_name
     ) VALUES ($1, $2, $3, $4::crm_membership_status, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET
       profile_id = EXCLUDED.profile_id,
       status = EXCLUDED.status,
       display_name = EXCLUDED.display_name,
       role = EXCLUDED.role,
       phone = EXCLUDED.phone,
       department = EXCLUDED.department,
       job_title = EXCLUDED.job_title,
       bio = EXCLUDED.bio,
       guest_company_id = EXCLUDED.guest_company_id,
       guest_company_name = EXCLUDED.guest_company_name`,
    [
      input.tenantId,
      input.userId,
      input.profileId,
      input.status,
      input.isDefault,
      local.displayName,
      local.role,
      local.phone,
      local.department,
      local.jobTitle,
      local.bio,
      guest.id,
      guest.name,
    ],
  )
}

function membershipStatusesForList(): string {
  return `('active', 'invited')`
}

export type ListUsersParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}


const USER_SORT_COLUMNS: Record<string, string> = {
  name: 'u.name',
  email: 'u.email',
  status: 'u.status',
  createdAt: 'mem.created_at',
}

export async function listUsers(
  params: ListUsersParams,
): Promise<{ items: UserListItem[]; total: number }> {
  const tenantId = getTenantIdOrDefault()
  const conditions: string[] = [
    'u.deleted_at IS NULL',
    USER_DIRECTORY_VISIBLE_CONDITION_U,
    `mem.status IN ${membershipStatusesForList()}`,
  ]
  const values: unknown[] = [tenantId]
  let idx = 2

  if (params.status?.trim()) {
    const statuses = parseCommaSeparatedList(params.status)
    if (statuses.length === 1) {
      conditions.push(`u.status = $${idx++}`)
      values.push(statuses[0])
    } else if (statuses.length > 1) {
      conditions.push(`u.status = ANY($${idx++}::text[])`)
      values.push(statuses)
    }
  }
  if (params.q) {
    conditions.push(
      `(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.role ILIKE $${idx} OR p.name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'mem.created_at',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    USER_SORT_COLUMNS,
    'u.name ASC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`
  const fromClause = `
     FROM crm_users u
     ${MEMBERSHIP_JOIN}
     ${PROFILE_JOIN}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       ${fromClause}
       ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<UserRow>(
      `SELECT ${SELECT_LIST_COLUMNS}
       ${fromClause}
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapUserRow), total }
  })
}

/** Directorio mínimo para asignar responsables (sin permiso al módulo Usuarios). */
export async function listUsersForAssignee(): Promise<UserListItem[]> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<UserRow>(
    `SELECT ${SELECT_LIST_COLUMNS}
     FROM crm_users u
     ${MEMBERSHIP_JOIN}
     ${PROFILE_JOIN}
     WHERE u.deleted_at IS NULL
       AND mem.status = 'active'
       AND ${USER_DIRECTORY_VISIBLE_CONDITION_U}
       AND (
         u.status = 'Activo'
         OR (p.system_key = 'guest' AND u.status <> 'Inactivo')
       )
     ORDER BY u.name ASC`,
    [tenantId],
  )
  return result.rows.map(mapUserRow)
}

/** Cumpleaños del equipo del tenant actual (nunca cruza otras instancias). */
export async function listTenantBirthdays(): Promise<TenantBirthdayItem[]> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{
    id: string
    name: string
    avatar_url: string | null
    birth_date: string
  }>(
    `SELECT
       u.id,
       COALESCE(NULLIF(trim(mem.display_name), ''), u.name) AS name,
       u.avatar_url,
       u.birth_date::text AS birth_date
     FROM crm_users u
     ${MEMBERSHIP_JOIN}
     ${PROFILE_JOIN}
     WHERE u.deleted_at IS NULL
       AND u.birth_date IS NOT NULL
       AND mem.status = 'active'
       AND u.status = 'Activo'
       AND ${USER_DIRECTORY_VISIBLE_CONDITION_U}
     ORDER BY
       EXTRACT(MONTH FROM u.birth_date)::int ASC,
       EXTRACT(DAY FROM u.birth_date)::int ASC,
       name ASC`,
    [tenantId],
  )

  return result.rows.map((row) => {
    const avatarUrl = entityImageUrlForList(
      `/api/v1/users/${row.id}/avatar`,
      row.avatar_url,
    )
    return {
      id: row.id,
      name: row.name,
      avatarUrl: avatarUrl || undefined,
      birthDate: row.birth_date.slice(0, 10),
    }
  })
}

/** Avatar en BD (solo si el usuario pertenece al tenant actual). */
export async function getUserAvatarStored(id: string): Promise<string | null> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ avatar_url: string | null }>(
    `SELECT u.avatar_url
     FROM crm_users u
     ${MEMBERSHIP_JOIN}
     WHERE u.id = $2
       AND u.deleted_at IS NULL
       AND mem.status IN ('active', 'invited', 'disabled')`,
    [tenantId, id],
  )
  return result.rows[0]?.avatar_url?.trim() ?? null
}

export async function loadTenantScopedUserRow(
  userId: string,
  tenantId: string,
): Promise<UserRow | null> {
  const result = await tenantQuery<UserRow>(
    `SELECT ${SELECT_DETAIL_COLUMNS}
     FROM crm_users u
     ${MEMBERSHIP_JOIN}
     ${PROFILE_JOIN}
     WHERE u.id = $2 AND u.deleted_at IS NULL
       AND mem.status IN ('active', 'invited', 'disabled')`,
    [tenantId, userId],
  )
  return result.rows[0] ?? null
}

export async function getUserById(id: string): Promise<UserDetail> {
  const tenantId = getTenantIdOrDefault()
  const row = await loadTenantScopedUserRow(id, tenantId)
  if (!row) throw notFound('Usuario no encontrado')
  const user = mapUserDetail(row)
  user.recentSessions = await listRecentUserSessions(id, tenantId)
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

  const tenantId = getTenantIdOrDefault()
  const normalizedEmail = input.email.trim().toLowerCase()
  const profileIsGuest = await isGuestProfileId(input.profileId.trim(), tenantId)
  await assertUserEmailNotInTenant(normalizedEmail, tenantId)
  await assertCanAssignGuestProfile(tenantId, actor, input.profileId.trim())

  const existingGlobal = await findUserByEmail(normalizedEmail)
  if (existingGlobal) {
    const existingStatus = await platformQuery<{ status: string }>(
      `SELECT status FROM crm_users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [existingGlobal.id],
    )
    const userStatus = existingStatus.rows[0]?.status ?? 'Por verificar'
    const membershipExists = await platformQuery<{ ok: number }>(
      `SELECT 1 AS ok FROM crm_tenant_memberships
       WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
      [tenantId, existingGlobal.id],
    )
    if (!membershipExists.rows[0]) {
      if (
        !profileIsGuest &&
        (statusCountsTowardSeat(userStatus) || statusCountsTowardSeat(status))
      ) {
        await enforceSeatQuota(actor, 1)
      }
    } else {
      const currentProfile = await platformQuery<{ profile_id: string }>(
        `SELECT profile_id FROM crm_tenant_memberships
         WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
        [tenantId, existingGlobal.id],
      )
      const previousProfileId = currentProfile.rows[0]?.profile_id
      if (previousProfileId !== input.profileId) {
        await assertCanAssignGuestProfile(tenantId, actor, input.profileId.trim(), {
          excludeUserId: existingGlobal.id,
        })
      }
    }
    const effectiveMembershipStatus =
      userStatus === 'Activo' || status === 'Activo' ? 'active' : 'invited'
    const guestCompany = await resolveMembershipGuestCompany(
      tenantId,
      input.profileId,
      input.guestCompanyId,
    )
    await upsertTenantMembership({
      tenantId,
      userId: existingGlobal.id,
      profileId: input.profileId,
      status: effectiveMembershipStatus,
      isDefault: false,
      local: membershipLocalFields(input),
      guestCompany: {
        id: guestCompany.guestCompanyId,
        name: guestCompany.guestCompanyName,
      },
    })

    const needsActivation =
      userStatus === 'Por verificar' || userStatus === 'Invitado'
    if (!password && sendInvite && needsActivation) {
      await sendAccountSetupInvite(existingGlobal.id)
    } else if (!password && sendInvite) {
      await sendTenantAccessGranted({
        userId: existingGlobal.id,
        tenantId,
        profileId: input.profileId,
        displayName: input.name.trim(),
      })
    }
    return getUserById(existingGlobal.id)
  }

  if (statusCountsTowardSeat(status) && !profileIsGuest) {
    await enforceSeatQuota(actor, 1)
  }

  let result
  try {
    result = password
    ? await tenantQuery<{ id: string }>(
        `INSERT INTO crm_users (
          email, name, password_hash, role, profile_id, status, avatar_url,
          phone, department, job_title, timezone, language, birth_date, bio,
          created_by_id, created_by_name, updated_by_id, updated_by_name,
          tenant_id
        ) VALUES (
          lower($1), $2, crypt($3, gen_salt('bf')), $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13::date, $14,
          $15, $16, $15, $16,
          $17
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
          input.birthDate ?? null,
          input.bio?.trim() || null,
          actor.userId,
          actor.userName,
          getTenantIdOrDefault(),
        ],
      )
    : await tenantQuery<{ id: string }>(
        `INSERT INTO crm_users (
          email, name, password_hash, role, profile_id, status, avatar_url,
          phone, department, job_title, timezone, language, birth_date, bio,
          created_by_id, created_by_name, updated_by_id, updated_by_name,
          tenant_id
        ) VALUES (
          lower($1), $2, NULL, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12::date, $13,
          $14, $15, $14, $15,
          $16
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
          input.birthDate ?? null,
          input.bio?.trim() || null,
          actor.userId,
          actor.userName,
          getTenantIdOrDefault(),
        ],
      )
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(
        `Ya existe un usuario con el correo «${input.email.trim()}». El correo debe ser único.`,
      )
    }
    throw error
  }

  const userId = result.rows[0]!.id
  const membershipStatus = status === 'Activo' ? 'active' : 'invited'
  const guestCompany = await resolveMembershipGuestCompany(
    tenantId,
    input.profileId,
    input.guestCompanyId,
  )
  await upsertTenantMembership({
    tenantId,
    userId,
    profileId: input.profileId,
    status: membershipStatus,
    isDefault: true,
    local: membershipLocalFields(input),
    guestCompany: {
      id: guestCompany.guestCompanyId,
      name: guestCompany.guestCompanyName,
    },
  })
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
  const tenantId = getTenantIdOrDefault()

  const globalSets: string[] = []
  const globalValues: unknown[] = []
  let globalIdx = 1

  const membershipSets: string[] = []
  const membershipValues: unknown[] = []
  let membershipIdx = 1

  if (input.name !== undefined) {
    membershipSets.push(`display_name = $${membershipIdx++}`)
    membershipValues.push(input.name.trim() || null)
  }
  if (input.role !== undefined) {
    membershipSets.push(`role = $${membershipIdx++}`)
    membershipValues.push(input.role.trim() || null)
  }
  if (input.profileId !== undefined) {
    if (input.profileId !== existing.profileId) {
      await assertCanAssignGuestProfile(tenantId, actor, input.profileId, {
        excludeUserId: id,
      })
      const wasGuest = await isGuestProfileId(existing.profileId, tenantId)
      const willBeGuest = await isGuestProfileId(input.profileId, tenantId)
      if (
        wasGuest &&
        !willBeGuest &&
        statusCountsTowardSeat(input.status ?? existing.status)
      ) {
        await assertCanConsumeSeat(tenantId, actor, 1)
      }
    }
    membershipSets.push(`profile_id = $${membershipIdx++}`)
    membershipValues.push(input.profileId)
    globalSets.push(`profile_id = $${globalIdx++}`)
    globalValues.push(input.profileId)
  }
  if (input.phone !== undefined) {
    membershipSets.push(`phone = $${membershipIdx++}`)
    membershipValues.push(input.phone.trim() || null)
  }
  if (input.department !== undefined) {
    membershipSets.push(`department = $${membershipIdx++}`)
    membershipValues.push(input.department.trim() || null)
  }
  if (input.jobTitle !== undefined) {
    membershipSets.push(`job_title = $${membershipIdx++}`)
    membershipValues.push(input.jobTitle.trim() || null)
  }
  if (input.bio !== undefined) {
    membershipSets.push(`bio = $${membershipIdx++}`)
    membershipValues.push(input.bio.trim() || null)
  }

  const effectiveProfileId = input.profileId ?? existing.profileId
  const profileChanging =
    input.profileId !== undefined && input.profileId !== existing.profileId

  if (input.guestCompanyId !== undefined) {
    const guestCompany = await resolveMembershipGuestCompany(
      tenantId,
      effectiveProfileId,
      input.guestCompanyId,
    )
    membershipSets.push(`guest_company_id = $${membershipIdx++}`)
    membershipValues.push(guestCompany.guestCompanyId)
    membershipSets.push(`guest_company_name = $${membershipIdx++}`)
    membershipValues.push(guestCompany.guestCompanyName)
  } else if (profileChanging && !(await isGuestProfile(tenantId, input.profileId!))) {
    membershipSets.push(`guest_company_id = $${membershipIdx++}`)
    membershipValues.push(null)
    membershipSets.push(`guest_company_name = $${membershipIdx++}`)
    membershipValues.push(null)
  }

  if (input.email !== undefined) {
    const nextEmail = input.email.trim()
    const currentEmail = existing.email.trim().toLowerCase()
    if (nextEmail.toLowerCase() !== currentEmail) {
      await assertUserEmailAvailable(nextEmail, id)
    }
    globalSets.push(`email = lower($${globalIdx++})`)
    globalValues.push(nextEmail)
  }
  if (input.status !== undefined) {
    if (input.status !== 'Activo' && (await isPlatformOperator(id))) {
      throw badRequest('No se puede desactivar un operador de plataforma.')
    }
    await assertCanConsumeSeatForUserStatusChange(
      tenantId,
      actor,
      existing.status,
      input.status,
      { profileId: effectiveProfileId },
    )
    await assertCanConsumeGuestQuotaForUserStatusChange(
      tenantId,
      actor,
      existing.status,
      input.status,
      { profileId: effectiveProfileId, excludeUserId: id },
    )
    globalSets.push(`status = $${globalIdx++}`)
    globalValues.push(input.status)
  }
  if (input.avatarUrl !== undefined) {
    globalSets.push(`avatar_url = $${globalIdx++}`)
    globalValues.push(input.avatarUrl.trim() || null)
  }
  if (input.timezone !== undefined) {
    globalSets.push(`timezone = $${globalIdx++}`)
    globalValues.push(input.timezone.trim())
  }
  if (input.language !== undefined) {
    globalSets.push(`language = $${globalIdx++}`)
    globalValues.push(input.language.trim())
  }
  if (input.birthDate !== undefined) {
    globalSets.push(`birth_date = $${globalIdx++}::date`)
    globalValues.push(input.birthDate)
  }
  if (input.password?.trim()) {
    globalSets.push(`password_hash = crypt($${globalIdx++}, gen_salt('bf'))`)
    globalValues.push(input.password.trim())
  }

  if (input.twoFactorEnabled !== undefined) {
    if (input.twoFactorEnabled) {
      globalSets.push(`two_factor_enabled = $${globalIdx++}`)
      globalValues.push(true)
    } else {
      await twoFactorRepo.disableTotpForUser(id)
    }
  }

  if (membershipSets.length > 0) {
    membershipValues.push(id, tenantId)
    await platformQuery(
      `UPDATE crm_tenant_memberships
       SET ${membershipSets.join(', ')}
       WHERE user_id = $${membershipIdx++} AND tenant_id = $${membershipIdx}`,
      membershipValues,
    )
  }

  if (globalSets.length === 0 && membershipSets.length === 0) {
    if (input.twoFactorEnabled === false) return getUserById(id)
    return getUserById(id)
  }

  if (globalSets.length > 0) {
    globalSets.push(`updated_by_id = $${globalIdx++}`)
    globalValues.push(actor.userId)
    globalSets.push(`updated_by_name = $${globalIdx++}`)
    globalValues.push(actor.userName)
    globalValues.push(id)

    try {
      await tenantQuery(
        `UPDATE crm_users SET ${globalSets.join(', ')}, updated_at = now()
         WHERE id = $${globalIdx} AND deleted_at IS NULL`,
        globalValues,
      )
    } catch (error) {
      if (isUniqueViolation(error) && input.email !== undefined) {
        throw conflict(
          `Ya existe un usuario con el correo «${input.email.trim()}». El correo debe ser único.`,
        )
      }
      throw error
    }

    if (input.email !== undefined || input.status !== undefined) {
      await reconcileUserDenormalizedNames(id)
    }
  }

  if (input.status === 'Activo') {
    await platformQuery(
      `UPDATE crm_tenant_memberships
       SET status = 'active'::crm_membership_status
       WHERE user_id = $1 AND tenant_id = $2 AND status = 'invited'::crm_membership_status`,
      [id, tenantId],
    )
  }

  return getUserById(id)
}

export async function softDeleteUser(id: string, actor: AuditActor): Promise<void> {
  if (id === actor.userId) {
    throw badRequest('No puedes eliminar tu propia cuenta.')
  }

  const tenantId = getTenantIdOrDefault()

  const membership = await platformQuery<{ id: string }>(
    `SELECT m.user_id AS id
     FROM crm_tenant_memberships m
     JOIN crm_users u ON u.id = m.user_id
     WHERE m.user_id = $1
       AND m.tenant_id = $2
       AND u.deleted_at IS NULL`,
    [id, tenantId],
  )
  if (!membership.rows[0]) throw notFound('Usuario no encontrado')

  const target = await platformQuery<{ is_platform_operator: boolean }>(
    `SELECT COALESCE(is_platform_operator, false) AS is_platform_operator
     FROM crm_users
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  if (target.rows[0]?.is_platform_operator) {
    throw badRequest('No se puede eliminar un operador de plataforma.')
  }

  await platformQuery(
    `DELETE FROM crm_tenant_memberships
     WHERE user_id = $1 AND tenant_id = $2`,
    [id, tenantId],
  )

  const remaining = await platformQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_tenant_memberships
     WHERE user_id = $1`,
    [id],
  )
  const membershipCount = Number.parseInt(remaining.rows[0]?.count ?? '0', 10)
  if (membershipCount === 0) {
    await platformQuery(
      `UPDATE crm_users
       SET deleted_at = now(),
           deleted_by_id = $2,
           updated_by_id = $2,
           updated_by_name = $3,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, actor.userId, actor.userName],
    )
  }
}
