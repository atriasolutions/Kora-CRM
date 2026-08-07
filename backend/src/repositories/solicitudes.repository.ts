import type { PoolClient } from 'pg'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'

import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import {
  TEAM_MEMBER_USER_NAME_SQL,
  teamMemberUserJoins,
} from '../lib/tenant-user-display-name-sql.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  collectNewTeamMembers,
  dedupeTeamMemberInputs,
  teamMembersFromDto,
  teamMembersFromInput,
} from '../lib/project-team-member-sync.js'
import {
  mapSolicitudDetail,
  mapSolicitudRow,
  mapSolicitudTeamRow,
  mapTeamRowsToListMembers,
  type SolicitudRow,
  type SolicitudTeamRow,
} from '../mappers/solicitud.mapper.js'
import { badRequest, forbidden, notFound } from '../middleware/errors.js'
import { getOrganizationSettings } from '../repositories/organization-settings.repository.js'
import {
  actorHasGuestProfile,
  getActorGuestCompany,
  resolveGuestSolicitudRequester,
} from '../repositories/users.repository.js'
import { notifySolicitudAssignment } from '../services/notifications.service.js'
import { notifyAndEmailNewSolicitudTeamMembers } from '../services/solicitud-team-member.service.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateSolicitudInput,
  SolicitudDetail,
  SolicitudListItem,
  SolicitudTeamMemberDto,
  SolicitudTeamMemberInput,
  UpdateSolicitudInput,
} from '../types/solicitud.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  pushDateRangeCondition,
  pushInListCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'

const SOLICITUD_COLUMNS = `
  id, code, title, description, status, priority,
  assignee_user_id, assignee_name,
  company_id, company_name,
  documentation_url, git_branch_url,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const TEAM_SELECT = `
  tm.id, tm.solicitud_id, tm.user_id,
  ${TEAM_MEMBER_USER_NAME_SQL} AS user_name,
  tm.role_label
`

export type ListSolicitudesParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  priority?: string
  archivedOnly?: boolean
  memberAccess?: { userId: string; userName: string }
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export function userHasSolicitudTeamAccess(
  assigneeName: string,
  team: SolicitudTeamMemberDto[],
  actor: AuditActor,
  createdBy?: { userId?: string | null; userName?: string | null },
  assigneeUserId?: string | null,
): boolean {
  const actorId = actor.userId.trim().toLowerCase()
  const actorName = actor.userName.trim().toLowerCase()
  const creatorId = createdBy?.userId?.trim().toLowerCase()
  const creatorName = createdBy?.userName?.trim().toLowerCase()
  if (creatorId && creatorId === actorId) return true
  if (creatorName && creatorName === actorName) return true

  const assigneeId = assigneeUserId?.trim().toLowerCase()
  if (assigneeId && assigneeId === actorId) return true
  const assignee = assigneeName.trim().toLowerCase()
  if (assignee && assignee === actorName) return true

  return team.some((member) => {
    const memberId = member.userId?.trim().toLowerCase()
    const memberName = member.name?.trim().toLowerCase()
    if (memberId && memberId === actorId) return true
    return Boolean(memberName && memberName === actorName)
  })
}

export function assertSolicitudTeamAccess(
  assigneeName: string,
  team: SolicitudTeamMemberDto[],
  actor: AuditActor,
  createdBy?: { userId?: string | null; userName?: string | null },
  assigneeUserId?: string | null,
): void {
  if (!userHasSolicitudTeamAccess(assigneeName, team, actor, createdBy, assigneeUserId)) {
    throw forbidden('No tienes acceso a esta solicitud.')
  }
}

function teamMemberInputKey(member: SolicitudTeamMemberInput): string {
  const id = member.userId?.trim().toLowerCase()
  if (id) return `id:${id}`
  return `name:${member.userName?.trim().toLowerCase() ?? ''}`
}

/** Responsable y creador siempre forman parte del equipo con acceso al registro. */
function buildSolicitudTeamMembersForInsert(
  team: SolicitudTeamMemberInput[] | undefined,
  assigneeName: string,
  assigneeUserId: string | null,
  creator: { userId: string; userName: string },
): SolicitudTeamMemberInput[] {
  const assignee = assigneeName.trim()
  const byKey = new Map<string, SolicitudTeamMemberInput>()

  const add = (member: SolicitudTeamMemberInput, preferRole?: string) => {
    const name = member.userName?.trim()
    if (!name) return
    const key = teamMemberInputKey(member)
    if (!key || key === 'name:') return
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        ...member,
        userName: name,
        roleLabel: preferRole ?? member.roleLabel?.trim() ?? undefined,
      })
      return
    }
    const role = preferRole ?? existing.roleLabel ?? member.roleLabel
    byKey.set(key, {
      userId: existing.userId ?? member.userId ?? undefined,
      userName: name,
      roleLabel: role?.trim() || undefined,
    })
  }

  for (const member of dedupeTeamMemberInputs(team, assignee)) {
    add(member)
  }
  if (assignee) {
    add(
      {
        userId: assigneeUserId,
        userName: assignee,
        roleLabel: 'Responsable',
      },
      'Responsable',
    )
  }
  add(
    {
      userId: creator.userId,
      userName: creator.userName,
      roleLabel: 'Creador',
    },
    creator.userId === assigneeUserId && assignee.toLowerCase() === creator.userName.trim().toLowerCase()
      ? 'Responsable'
      : 'Creador',
  )

  return Array.from(byKey.values())
}

async function loadSolicitudTeam(solicitudId: string): Promise<SolicitudTeamMemberDto[]> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<SolicitudTeamRow>(
    `SELECT ${TEAM_SELECT}
     FROM crm_solicitud_team_members tm
     ${teamMemberUserJoins(2)}
     WHERE tm.solicitud_id = $1
     ORDER BY user_name ASC`,
    [solicitudId, tenantId],
  )
  return result.rows.map(mapSolicitudTeamRow)
}

async function loadTeamsBySolicitudIds(
  solicitudIds: string[],
): Promise<Map<string, SolicitudTeamMemberDto[]>> {
  const map = new Map<string, SolicitudTeamMemberDto[]>()
  if (solicitudIds.length === 0) return map

  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<SolicitudTeamRow>(
    `SELECT ${TEAM_SELECT}
     FROM crm_solicitud_team_members tm
     ${teamMemberUserJoins(2)}
     WHERE tm.solicitud_id = ANY($1::uuid[])
     ORDER BY tm.solicitud_id, user_name ASC`,
    [solicitudIds, tenantId],
  )

  for (const row of result.rows) {
    const list = map.get(row.solicitud_id) ?? []
    list.push(mapSolicitudTeamRow(row))
    map.set(row.solicitud_id, list)
  }
  return map
}

async function nextSolicitudCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `SOL-${year}-`
  const result = await tenantQuery<{ code: string }>(
    `SELECT code FROM crm_solicitudes
     WHERE code LIKE $1
     ORDER BY code DESC
     LIMIT 1`,
    [`${prefix}%`],
  )
  const last = result.rows[0]?.code
  let seq = 1
  if (last) {
    const part = last.slice(prefix.length)
    const n = Number.parseInt(part, 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

async function resolveDefaultAssignee(
  actor: AuditActor,
): Promise<{ userId: string | null; userName: string }> {
  const settings = await getOrganizationSettings()
  const defaultId = settings.defaultSolicitudAssigneeUserId?.trim()
  const defaultName = settings.defaultSolicitudAssigneeName?.trim()
  if (defaultId) {
    const user = await tenantQuery<{ id: string; name: string }>(
      `SELECT id, name FROM crm_users
       WHERE id = $1 AND deleted_at IS NULL AND status = 'Activo' AND ${tenantWhereParam(2)}`,
      [defaultId, getTenantIdOrDefault()],
    )
    const row = user.rows[0]
    if (row) {
      return {
        userId: row.id,
        userName: defaultName || row.name?.trim() || actor.userName,
      }
    }
  }
  if (defaultName) {
    const byName = await tenantQuery<{ id: string; name: string }>(
      `SELECT id, name FROM crm_users
       WHERE deleted_at IS NULL AND status = 'Activo'
         AND lower(trim(name)) = lower($1)
         AND ${tenantWhereParam(2)}
       LIMIT 1`,
      [defaultName, getTenantIdOrDefault()],
    )
    const row = byName.rows[0]
    if (row) {
      return { userId: row.id, userName: row.name?.trim() || defaultName }
    }
    return { userId: null, userName: defaultName }
  }
  return { userId: actor.userId, userName: actor.userName }
}

async function resolveAssignee(
  input: CreateSolicitudInput | UpdateSolicitudInput,
  actor: AuditActor,
  fallback?: { userId: string | null; userName: string },
): Promise<{ userId: string | null; userName: string }> {
  if (input.assigneeUserId !== undefined || input.assigneeName !== undefined) {
    const userId = input.assigneeUserId?.trim() || null
    const name = input.assigneeName?.trim()
    if (userId) {
      const user = await tenantQuery<{ name: string }>(
        `SELECT name FROM crm_users
         WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
        [userId, getTenantIdOrDefault()],
      )
      const row = user.rows[0]
      return {
        userId,
        userName: name || row?.name?.trim() || fallback?.userName || actor.userName,
      }
    }
    if (name) return { userId: null, userName: name }
  }
  if (fallback) return fallback
  return resolveDefaultAssignee(actor)
}

async function insertSolicitudTeam(
  client: PoolClient,
  solicitudId: string,
  team: SolicitudTeamMemberInput[] | undefined,
  assigneeName: string,
  assigneeUserId: string | null,
  creator: { userId: string; userName: string },
): Promise<void> {
  const members = buildSolicitudTeamMembersForInsert(
    team,
    assigneeName,
    assigneeUserId,
    creator,
  )

  for (const member of members) {
    const userName = member.userName?.trim()
    if (!userName) continue
    await client.query(
      `INSERT INTO crm_solicitud_team_members (solicitud_id, user_id, user_name, role_label)
       VALUES ($1, $2, $3, $4)`,
      [
        solicitudId,
        member.userId ?? null,
        userName,
        member.roleLabel?.trim() || null,
      ],
    )
  }
}


const SOLICITUD_SORT_COLUMNS: Record<string, string> = {
  code: 'code',
  title: 'title',
  status: 'status',
  priority: 'priority',
  assignee: 'assignee_name',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
}

export async function listSolicitudes(
  params: ListSolicitudesParams,
): Promise<{ items: SolicitudListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)

  idx = pushInListCondition(conditions, values, idx, 'status', params.status)
  idx = pushInListCondition(conditions, values, idx, 'priority', params.priority)
  if (params.q) {
    conditions.push(
      `(code ILIKE $${idx} OR title ILIKE $${idx} OR description ILIKE $${idx} OR assignee_name ILIKE $${idx} OR company_name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }
  if (params.memberAccess) {
    const userName = params.memberAccess.userName.trim()
    const userId = params.memberAccess.userId
    const nameIdx = idx++
    const idIdx = idx++
    conditions.push(
      `(
        created_by_id = $${idIdx}::uuid
        OR lower(trim(assignee_name)) = lower($${nameIdx})
        OR EXISTS (
          SELECT 1 FROM crm_solicitud_team_members tm
          WHERE tm.solicitud_id = crm_solicitudes.id
          AND (
            tm.user_id = $${idIdx}::uuid
            OR lower(trim(tm.user_name)) = lower($${nameIdx})
          )
        )
      )`,
    )
    values.push(userName, userId)
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'created_at',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    SOLICITUD_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_solicitudes ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<SolicitudRow>(
      `SELECT ${SOLICITUD_COLUMNS}
       FROM crm_solicitudes
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    const solicitudIds = result.rows.map((row) => row.id)
    const teamsBySolicitud = await loadTeamsBySolicitudIds(solicitudIds)

    return {
      items: result.rows.map((row) => ({
        ...mapSolicitudRow(row),
        teamMembers: mapTeamRowsToListMembers(teamsBySolicitud.get(row.id)),
      })),
      total,
    }
  })
}

export async function getSolicitudById(id: string): Promise<SolicitudDetail> {
  const result = await tenantQuery<SolicitudRow>(
    `SELECT ${SOLICITUD_COLUMNS}
     FROM crm_solicitudes
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Solicitud no encontrada')
  return mapSolicitudDetail(row, await loadSolicitudTeam(id))
}

export async function createSolicitud(
  input: CreateSolicitudInput,
  actor: AuditActor,
): Promise<SolicitudDetail> {
  await enforceRecordQuota(actor)
  if (!input.title?.trim()) throw badRequest('El título es obligatorio')

  const defaultAssignee = await resolveDefaultAssignee(actor)
  const assignee = await resolveAssignee(input, actor, defaultAssignee)
  const code = await nextSolicitudCode()
  const tenantId = getTenantIdOrDefault()
  const actorIsGuest = await actorHasGuestProfile(actor.userId, tenantId)
  const requesterId = input.requesterUserId?.trim() || null

  if (requesterId && actorIsGuest) {
    throw forbidden('Los invitados no pueden crear solicitudes a petición de otro usuario')
  }

  let createdById = actor.userId
  let createdByName = actor.userName
  let companyId: string | null = null
  let companyName = ''

  if (requesterId) {
    const requester = await resolveGuestSolicitudRequester(requesterId, tenantId)
    createdById = requester.userId
    createdByName = requester.userName
    companyId = requester.companyId
    companyName = requester.companyName
  } else if (actorIsGuest) {
    const guestCompany = await getActorGuestCompany(actor.userId, tenantId)
    companyId = guestCompany.companyId
    companyName = guestCompany.companyName
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<SolicitudRow>(
      `INSERT INTO crm_solicitudes (
        code, title, description, status, priority,
        assignee_user_id, assignee_name,
        company_id, company_name,
        documentation_url, git_branch_url,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12, $13, $14, $15, $16
      )
      RETURNING ${SOLICITUD_COLUMNS}`,
      [
        code,
        input.title.trim(),
        input.description?.trim() ?? '',
        input.status ?? 'Nuevo',
        input.priority ?? 'Media',
        assignee.userId,
        assignee.userName,
        companyId,
        companyName,
        input.documentationUrl?.trim() ?? '',
        input.gitBranchUrl?.trim() ?? '',
        createdById,
        createdByName,
        actor.userId,
        actor.userName,
        tenantId,
      ],
    )
    const row = result.rows[0]!
    await insertSolicitudTeam(
      client,
      row.id,
      input.team,
      assignee.userName,
      assignee.userId,
      { userId: createdById, userName: createdByName },
    )
    await client.query('COMMIT')
    const detail = mapSolicitudDetail(row, await loadSolicitudTeam(row.id))
    if (assignee.userName.trim().toLowerCase() !== actor.userName.trim().toLowerCase()) {
      void notifySolicitudAssignment({
        actor,
        assigneeName: assignee.userName,
        solicitudId: detail.id,
        solicitudTitle: detail.title,
      }).catch(() => {
        /* ignore */
      })
    }
    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updateSolicitud(
  id: string,
  input: UpdateSolicitudInput,
  actor: AuditActor,
): Promise<SolicitudDetail> {
  const existing = await getSolicitudById(id)
  const assignee = await resolveAssignee(input, actor, {
    userId: existing.assigneeUserId ?? null,
    userName: existing.assignee,
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<SolicitudRow>(
      `UPDATE crm_solicitudes SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        assignee_user_id = $6,
        assignee_name = $7,
        documentation_url = COALESCE($8, documentation_url),
        git_branch_url = COALESCE($9, git_branch_url),
        updated_by_id = $10,
        updated_by_name = $11,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(12)}
      RETURNING ${SOLICITUD_COLUMNS}`,
      [
        id,
        input.title?.trim() || null,
        input.description !== undefined ? input.description.trim() : null,
        input.status ?? null,
        input.priority ?? null,
        assignee.userId,
        assignee.userName,
        input.documentationUrl !== undefined ? input.documentationUrl.trim() : null,
        input.gitBranchUrl !== undefined ? input.gitBranchUrl.trim() : null,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Solicitud no encontrada')

    const nextAssigneeName = assignee.userName
    const newTeamMembers =
      input.team !== undefined
        ? collectNewTeamMembers(
            teamMembersFromDto(existing.team),
            teamMembersFromInput(input.team),
            nextAssigneeName,
          )
        : []

    if (input.team) {
      await client.query(`DELETE FROM crm_solicitud_team_members WHERE solicitud_id = $1`, [
        id,
      ])
      await insertSolicitudTeam(
        client,
        id,
        input.team,
        nextAssigneeName,
        assignee.userId,
        {
          userId: existing.createdById?.trim() || actor.userId,
          userName: existing.createdByName?.trim() || actor.userName,
        },
      )
    }

    await client.query('COMMIT')
    const detail = mapSolicitudDetail(row, await loadSolicitudTeam(id))
    const previousAssignee = existing.assignee?.trim() ?? ''
    const nextAssignee = detail.assignee?.trim() ?? ''
    if (nextAssignee && nextAssignee !== previousAssignee) {
      void notifySolicitudAssignment({
        actor,
        assigneeName: nextAssignee,
        solicitudId: detail.id,
        solicitudTitle: detail.title,
      }).catch(() => {
        /* ignore */
      })
    }

    if (newTeamMembers.length > 0) {
      void notifyAndEmailNewSolicitudTeamMembers({
        actor,
        solicitudId: detail.id,
        solicitudTitle: detail.title,
        members: newTeamMembers,
      }).catch(() => {
        /* ignore */
      })
    }

    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function archiveSolicitud(
  id: string,
  actor: AuditActor,
): Promise<SolicitudListItem> {
  const result = await tenantQuery<SolicitudRow>(
    `UPDATE crm_solicitudes
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${SOLICITUD_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Solicitud no encontrada o ya archivada')
  return mapSolicitudRow(row)
}

export async function restoreSolicitud(
  id: string,
  actor: AuditActor,
): Promise<SolicitudListItem> {
  const result = await tenantQuery<SolicitudRow>(
    `UPDATE crm_solicitudes
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${SOLICITUD_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Solicitud no encontrada')
  return mapSolicitudRow(row)
}

export async function permanentlyDeleteSolicitud(id: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const found = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_solicitudes
       WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NOT NULL
       FOR UPDATE`,
      [id],
    )
    if (!found.rows[0]) {
      throw notFound('Solicitud no encontrada en archivados')
    }

    await client.query(`DELETE FROM crm_solicitud_team_members WHERE solicitud_id = $1`, [
      id,
    ])
    // Bitácora y actividades conservan la referencia (solicitud_id / related_id + snapshots).
    await purgeEntityNotesAndFiles('solicitud', id, client)
    await client.query(`DELETE FROM crm_solicitudes WHERE id = $1`, [id])

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
