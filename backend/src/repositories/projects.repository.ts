import type { PoolClient } from 'pg'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'

import { getCompanyLinkById } from '../repositories/companies.repository.js'
import {
  resolveOpportunitySnapshot,
} from '../lib/relation-snapshots.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import {
  TEAM_MEMBER_USER_NAME_SQL,
  teamMemberUserJoins,
} from '../lib/tenant-user-display-name-sql.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapProjectDetail,
  mapProjectRow,
  type ProjectRow,
  type ProjectTeamRow,
} from '../mappers/project.mapper.js'
import { badRequest, forbidden, notFound } from '../middleware/errors.js'
import type { ProjectTeamMemberDto } from '../types/project.js'
import {
  collectNewTeamMembers,
  dedupeTeamMemberInputs,
  teamMembersFromDto,
  teamMembersFromInput,
} from '../lib/project-team-member-sync.js'
import { notifyProjectAssignment } from '../services/notifications.service.js'
import { notifyAndEmailNewProjectTeamMembers } from '../services/project-team-member.service.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectListItem,
  ProjectTeamMemberInput,
  UpdateProjectInput,
} from '../types/project.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'

const PROJECT_COLUMNS = `
  id, name, client_name, customer_kind, company_id, contact_id,
  opportunity_id, opportunity_name,
  accepted_quote_id, quote_code,
  solicitud_id, solicitud_code, solicitud_title,
  progress_pct, work_plan_json, deadline, manager_name,
  journey_stage, status, priority, health, budget_cents, start_date,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const TEAM_SELECT = `
  tm.id, tm.project_id, tm.user_id,
  ${TEAM_MEMBER_USER_NAME_SQL} AS user_name,
  tm.role_label
`

export type ListProjectsParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  opportunityId?: string
  solicitudId?: string
  companyId?: string
  archivedOnly?: boolean
  /** Si se define, solo proyectos donde el usuario es gerente o miembro del equipo. */
  memberAccess?: { userId: string; userName: string }
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export function userHasProjectTeamAccess(
  managerName: string,
  team: ProjectTeamMemberDto[],
  actor: AuditActor,
): boolean {
  const actorName = actor.userName.trim().toLowerCase()
  const manager = managerName.trim().toLowerCase()
  if (manager && manager === actorName) return true
  const actorId = actor.userId.trim().toLowerCase()
  return team.some((member) => {
    const memberId = member.userId?.trim().toLowerCase()
    const memberName = member.name?.trim().toLowerCase()
    if (memberId && memberId === actorId) return true
    return Boolean(memberName && memberName === actorName)
  })
}

export function assertProjectTeamAccess(
  managerName: string,
  team: ProjectTeamMemberDto[],
  actor: AuditActor,
): void {
  if (!userHasProjectTeamAccess(managerName, team, actor)) {
    throw forbidden('No tienes acceso a este proyecto.')
  }
}

async function loadProjectTeam(projectId: string): Promise<ProjectTeamRow[]> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<ProjectTeamRow>(
    `SELECT ${TEAM_SELECT}
     FROM crm_project_team_members tm
     ${teamMemberUserJoins(2)}
     WHERE tm.project_id = $1
     ORDER BY user_name ASC, tm.id ASC`,
    [projectId, tenantId],
  )
  return result.rows
}

async function loadTeamsByProjectIds(
  projectIds: string[],
): Promise<Map<string, ProjectTeamRow[]>> {
  const map = new Map<string, ProjectTeamRow[]>()
  if (projectIds.length === 0) return map
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<ProjectTeamRow>(
    `SELECT ${TEAM_SELECT}
     FROM crm_project_team_members tm
     ${teamMemberUserJoins(2)}
     WHERE tm.project_id = ANY($1::uuid[])
     ORDER BY tm.project_id, user_name ASC, tm.id ASC`,
    [projectIds, tenantId],
  )
  for (const row of result.rows) {
    const list = map.get(row.project_id) ?? []
    list.push(row)
    map.set(row.project_id, list)
  }
  return map
}

function mapTeamRowsToListMembers(
  rows: ProjectTeamRow[] | undefined,
): ProjectListItem['teamMembers'] {
  if (!rows?.length) return []
  return rows.map((row) => ({
    id: row.id,
    name: row.user_name,
    userId: row.user_id ?? undefined,
    role: row.role_label ?? undefined,
  }))
}

function resolveBudgetCents(input: CreateProjectInput | UpdateProjectInput): number | null {
  if (input.budgetCents != null) return input.budgetCents
  if (input.budget != null) return parseMoneyToCents(input.budget)
  return null
}

async function resolveQuoteSnapshot(
  quoteId?: string | null,
): Promise<{ acceptedQuoteId: string | null; quoteCode: string }> {
  if (!quoteId?.trim()) return { acceptedQuoteId: null, quoteCode: '' }
  const result = await tenantQuery<{ id: string; code: string; opportunity_id: string | null }>(
    `SELECT id, code, opportunity_id FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [quoteId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Cotización no encontrada')
  return { acceptedQuoteId: row.id, quoteCode: row.code }
}

async function validateQuoteForOpportunity(
  opportunityId: string | null,
  acceptedQuoteId: string | null,
): Promise<void> {
  if (!acceptedQuoteId) return
  if (!opportunityId) {
    throw badRequest('Selecciona una oportunidad antes de vincular una cotización.')
  }
  const result = await tenantQuery<{ opportunity_id: string | null }>(
    `SELECT opportunity_id FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [acceptedQuoteId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('La cotización seleccionada no existe.')
  if (row.opportunity_id !== opportunityId) {
    throw badRequest('La cotización debe pertenecer a la oportunidad seleccionada.')
  }
}

async function resolveProjectClientFields(input: {
  customerKind?: string | null
  contactId?: string | null
  companyId?: string | null
  client?: string
}): Promise<{
  clientName: string
  companyId: string | null
  customerKind: string | null
  contactId: string | null
}> {
  const kind = input.customerKind?.trim() || null
  if (kind === 'contacto') {
    const contactId = input.contactId?.trim()
    if (!contactId) throw badRequest('Selecciona un contacto (B2C).')
    const result = await tenantQuery<{ name: string }>(
      `SELECT name FROM crm_contacts WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
      [contactId, getTenantIdOrDefault()],
    )
    const name = result.rows[0]?.name?.trim()
    if (!name) throw badRequest('Contacto no encontrado')
    return { clientName: name, companyId: null, customerKind: 'contacto', contactId }
  }
  if (kind === 'empresa') {
    const company = await resolveCompany(input.companyId, input.client)
    if (!company.clientName) throw badRequest('El cliente es obligatorio')
    return {
      clientName: company.clientName,
      companyId: company.companyId,
      customerKind: 'empresa',
      contactId: input.contactId?.trim() || null,
    }
  }
  const clientName = input.client?.trim() || ''
  if (!clientName) throw badRequest('El cliente es obligatorio')
  const company = await resolveCompany(input.companyId, clientName)
  return {
    clientName: company.clientName || clientName,
    companyId: company.companyId,
    customerKind: null,
    contactId: null,
  }
}

async function resolveCompany(
  companyId?: string | null,
  clientName?: string,
): Promise<{ companyId: string | null; clientName: string }> {
  if (companyId?.trim()) {
    const company = await getCompanyLinkById(companyId)
    if (company) return { companyId: company.id, clientName: company.name }
  }
  const name = clientName?.trim() || ''
  if (!name) return { companyId: null, clientName: '' }
  const byName = await tenantQuery<{ id: string; name: string }>(
    `SELECT id, name FROM crm_companies
     WHERE deleted_at IS NULL AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [name],
  )
  if (byName.rows[0]) {
    return { companyId: byName.rows[0].id, clientName: byName.rows[0].name }
  }
  return { companyId: null, clientName: name }
}

async function resolveSolicitudSnapshot(
  solicitudId?: string | null,
): Promise<{ solicitudId: string | null; solicitudCode: string; solicitudTitle: string }> {
  if (!solicitudId?.trim()) {
    return { solicitudId: null, solicitudCode: '', solicitudTitle: '' }
  }
  const result = await tenantQuery<{ id: string; code: string; title: string }>(
    `SELECT id, code, title FROM crm_solicitudes
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [solicitudId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Solicitud no encontrada')
  return { solicitudId: row.id, solicitudCode: row.code, solicitudTitle: row.title }
}

async function resolveCommercialLinks(input: {
  companyId?: string | null
  client?: string
  opportunityId?: string | null
  acceptedQuoteId?: string | null
}): Promise<{
  companyId: string | null
  clientName: string
  opportunityId: string | null
  opportunityName: string
  acceptedQuoteId: string | null
  quoteCode: string
}> {
  const opp = await resolveOpportunitySnapshot(input.opportunityId)
  const quote = await resolveQuoteSnapshot(input.acceptedQuoteId)
  await validateQuoteForOpportunity(opp.opportunityId, quote.acceptedQuoteId)

  let companyId = input.companyId ?? null
  let clientName = input.client?.trim() || ''

  if (opp.opportunityId) {
    const oppRow = await tenantQuery<{
      company_id: string | null
      company_name: string
    }>(
      `SELECT company_id, company_name FROM crm_opportunities WHERE id = $1`,
      [opp.opportunityId],
    )
    const o = oppRow.rows[0]
    if (o) {
      if (o.company_id) {
        companyId = o.company_id
        clientName = o.company_name
      } else if (!clientName) {
        clientName = o.company_name
      }
    }
  }

  const company = await resolveCompany(companyId, clientName)
  return {
    companyId: company.companyId,
    clientName: company.clientName,
    opportunityId: opp.opportunityId,
    opportunityName: opp.opportunityName,
    acceptedQuoteId: quote.acceptedQuoteId,
    quoteCode: quote.quoteCode,
  }
}

async function resolveProjectOriginLinks(input: {
  companyId?: string | null
  client?: string
  opportunityId?: string | null
  acceptedQuoteId?: string | null
  solicitudId?: string | null
}): Promise<{
  companyId: string | null
  clientName: string
  opportunityId: string | null
  opportunityName: string
  acceptedQuoteId: string | null
  quoteCode: string
  solicitudId: string | null
  solicitudCode: string
  solicitudTitle: string
}> {
  const solicitud = await resolveSolicitudSnapshot(input.solicitudId)
  const hasSolicitud = Boolean(solicitud.solicitudId)
  const hasOpportunity = Boolean(input.opportunityId?.trim())

  if (hasSolicitud && hasOpportunity) {
    throw badRequest('El proyecto no puede vincular oportunidad y solicitud a la vez.')
  }

  if (hasSolicitud) {
    const company = await resolveCompany(input.companyId ?? null, input.client?.trim() || '')
    return {
      companyId: company.companyId,
      clientName: company.clientName,
      opportunityId: null,
      opportunityName: '',
      acceptedQuoteId: null,
      quoteCode: '',
      solicitudId: solicitud.solicitudId,
      solicitudCode: solicitud.solicitudCode,
      solicitudTitle: solicitud.solicitudTitle,
    }
  }

  const commercial = await resolveCommercialLinks(input)
  return {
    ...commercial,
    solicitudId: null,
    solicitudCode: '',
    solicitudTitle: '',
  }
}

async function insertProjectTeam(
  client: PoolClient,
  projectId: string,
  team: ProjectTeamMemberInput[] | undefined,
  managerName: string,
): Promise<void> {
  const deduped = dedupeTeamMemberInputs(team, managerName)
  const members =
    deduped.length > 0
      ? deduped
      : [{ userName: managerName, roleLabel: 'Gerente de proyecto' }]

  for (const member of members) {
    const userName = member.userName?.trim()
    if (!userName) continue
    await client.query(
      `INSERT INTO crm_project_team_members (project_id, user_id, user_name, role_label)
       VALUES ($1, $2, $3, $4)`,
      [
        projectId,
        member.userId ?? null,
        userName,
        member.roleLabel?.trim() || null,
      ],
    )
  }
}


const PROJECT_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  status: 'status',
  clientName: 'client_name',
  manager: 'manager_name',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
}

export async function listProjects(
  params: ListProjectsParams,
): Promise<{ items: ProjectListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
  if (params.status?.trim()) {
    const statuses = parseCommaSeparatedList(params.status)
    if (statuses.length === 1) {
      conditions.push(`status = $${idx++}`)
      values.push(statuses[0])
    } else if (statuses.length > 1) {
      conditions.push(`status = ANY($${idx++}::text[])`)
      values.push(statuses)
    }
  }
  if (params.opportunityId) {
    conditions.push(`opportunity_id = $${idx++}`)
    values.push(params.opportunityId)
  }
  if (params.solicitudId) {
    conditions.push(`solicitud_id = $${idx++}`)
    values.push(params.solicitudId)
  }
  if (params.companyId) {
    conditions.push(
      `(company_id = $${idx} OR (
        company_id IS NULL AND client_name <> ''
        AND client_name = (SELECT name FROM crm_companies WHERE id = $${idx})
      ))`,
    )
    values.push(params.companyId)
    idx++
  }
  if (params.q) {
    conditions.push(
      `(name ILIKE $${idx} OR client_name ILIKE $${idx} OR manager_name ILIKE $${idx} OR opportunity_name ILIKE $${idx})`,
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
        lower(trim(manager_name)) = lower($${nameIdx})
        OR EXISTS (
          SELECT 1 FROM crm_project_team_members tm
          WHERE tm.project_id = crm_projects.id
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
    'updated_at',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    PROJECT_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_projects ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<ProjectRow>(
      `SELECT ${PROJECT_COLUMNS}
       FROM crm_projects
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    const projectIds = result.rows.map((row) => row.id)
    const teamsByProject = await loadTeamsByProjectIds(projectIds)

    return {
      items: result.rows.map((row) => ({
        ...mapProjectRow(row),
        teamMembers: mapTeamRowsToListMembers(teamsByProject.get(row.id)),
      })),
      total,
    }
  })
}

export async function getProjectById(id: string): Promise<ProjectDetail> {
  const result = await tenantQuery<ProjectRow>(
    `SELECT ${PROJECT_COLUMNS}
     FROM crm_projects
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado')
  return mapProjectDetail(row, await loadProjectTeam(id))
}

export async function createProject(
  input: CreateProjectInput,
  actor: AuditActor,
): Promise<ProjectDetail> {
  await enforceRecordQuota(actor)
  if (!input.name?.trim()) throw badRequest('El nombre del proyecto es obligatorio')
  if (!input.deadline?.trim()) throw badRequest('La fecha de entrega es obligatoria')

  const deadlineIso = parseDateInput(input.deadline)
  const startIso =
    parseDateInput(input.startDate) ?? new Date().toISOString().slice(0, 10)
  if (deadlineIso && startIso && deadlineIso < startIso) {
    throw badRequest(
      'La fecha de entrega debe ser igual o posterior a la fecha de inicio.',
    )
  }

  const clientFields = await resolveProjectClientFields(input)
  const links = await resolveProjectOriginLinks({
    companyId: input.companyId ?? clientFields.companyId,
    client: clientFields.clientName,
    opportunityId: input.opportunityId,
    acceptedQuoteId: input.acceptedQuoteId,
    solicitudId: input.solicitudId,
  })
  if (!links.clientName) throw badRequest('El cliente es obligatorio')
  const { customerKind, contactId } = clientFields

  const budgetCents = resolveBudgetCents(input)
  const managerName = input.managerName?.trim() || actor.userName

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<ProjectRow>(
      `INSERT INTO crm_projects (
        name, client_name, customer_kind, company_id, contact_id,
        opportunity_id, opportunity_name,
        accepted_quote_id, quote_code,
        solicitud_id, solicitud_code, solicitud_title,
        progress_pct, deadline, manager_name,
        journey_stage, status, priority, health, budget_cents, start_date,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11, $12,
        $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $22, $23, $24
      )
      RETURNING ${PROJECT_COLUMNS}`,
      [
        input.name.trim(),
        links.clientName,
        customerKind,
        links.companyId,
        contactId,
        links.opportunityId,
        links.opportunityName,
        links.acceptedQuoteId,
        links.quoteCode,
        links.solicitudId,
        links.solicitudCode,
        links.solicitudTitle,
        0,
        parseDateInput(input.deadline),
        managerName,
        input.journeyStage ?? 'Nuevo',
        input.status ?? 'En curso',
        input.priority ?? 'Media',
        input.health ?? 'En plazo',
        budgetCents,
        parseDateInput(input.startDate) ?? new Date().toISOString().slice(0, 10),
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]!
    await insertProjectTeam(client, row.id, input.team, managerName)
    await client.query('COMMIT')
    const detail = mapProjectDetail(row, await loadProjectTeam(row.id))
    void notifyProjectAssignment({
      actor,
      managerName: detail.manager,
      projectId: detail.id,
      projectName: detail.name,
    }).catch(() => {
      /* ignore realtime errors */
    })
    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
  actor: AuditActor,
): Promise<ProjectDetail> {
  const existing = await getProjectById(id)

  const opportunityId =
    input.opportunityId !== undefined
      ? input.opportunityId
      : existing.opportunityId ?? null
  const acceptedQuoteId =
    input.acceptedQuoteId !== undefined
      ? input.acceptedQuoteId
      : existing.acceptedQuoteId ?? null

  const solicitudId =
    input.solicitudId !== undefined
      ? input.solicitudId
      : existing.solicitudId ?? null

  const clientInputTouched =
    input.customerKind !== undefined ||
    input.contactId !== undefined ||
    input.companyId !== undefined ||
    input.client !== undefined

  const clientFields = clientInputTouched
    ? await resolveProjectClientFields({
        customerKind: input.customerKind ?? existing.customerKind ?? null,
        contactId: input.contactId ?? existing.contactId ?? null,
        companyId: input.companyId ?? existing.companyId ?? null,
        client: input.client ?? existing.client,
      })
    : null

  const links =
    input.opportunityId !== undefined ||
    input.acceptedQuoteId !== undefined ||
    input.solicitudId !== undefined ||
    clientInputTouched
      ? await resolveProjectOriginLinks({
          companyId: input.companyId ?? clientFields?.companyId ?? existing.companyId ?? null,
          client: clientFields?.clientName ?? input.client ?? existing.client,
          opportunityId,
          acceptedQuoteId,
          solicitudId,
        })
      : {
          companyId: existing.companyId ?? null,
          clientName: existing.client,
          opportunityId: existing.opportunityId ?? null,
          opportunityName: existing.opportunityName ?? '',
          acceptedQuoteId: existing.acceptedQuoteId ?? null,
          quoteCode: existing.acceptedQuoteCode ?? '',
          solicitudId: existing.solicitudId ?? null,
          solicitudCode: existing.solicitudCode ?? '',
          solicitudTitle: existing.solicitudTitle ?? '',
        }

  const customerKind = clientFields?.customerKind ?? existing.customerKind ?? null
  const contactId = clientFields?.contactId ?? existing.contactId ?? null

  const effectiveDeadline =
    input.deadline !== undefined
      ? parseDateInput(input.deadline)
      : parseDateInput(existing.deadline)
  const effectiveStart =
    input.startDate !== undefined
      ? parseDateInput(input.startDate)
      : parseDateInput(existing.startDate)
  if (
    effectiveDeadline &&
    effectiveStart &&
    effectiveDeadline < effectiveStart
  ) {
    throw badRequest(
      'La fecha de entrega debe ser igual o posterior a la fecha de inicio.',
    )
  }

  const budgetCents = resolveBudgetCents(input)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<ProjectRow>(
      `UPDATE crm_projects SET
        name = COALESCE($2, name),
        client_name = $3,
        customer_kind = $4,
        company_id = $5,
        contact_id = $6,
        opportunity_id = $7,
        opportunity_name = $8,
        accepted_quote_id = $9,
        quote_code = $10,
        solicitud_id = $11,
        solicitud_code = $12,
        solicitud_title = $13,
        deadline = COALESCE($14, deadline),
        manager_name = COALESCE($15, manager_name),
        journey_stage = COALESCE($16, journey_stage),
        status = COALESCE($17, status),
        priority = COALESCE($18, priority),
        health = COALESCE($19, health),
        budget_cents = COALESCE($20, budget_cents),
        start_date = COALESCE($21, start_date),
        updated_by_id = $22,
        updated_by_name = $23,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(24)}
      RETURNING ${PROJECT_COLUMNS}`,
      [
        id,
        input.name?.trim() || null,
        links.clientName,
        customerKind,
        links.companyId,
        contactId,
        links.opportunityId,
        links.opportunityName,
        links.acceptedQuoteId,
        links.quoteCode,
        links.solicitudId,
        links.solicitudCode,
        links.solicitudTitle,
        parseDateInput(input.deadline),
        input.managerName?.trim() || null,
        input.journeyStage ?? null,
        input.status ?? null,
        input.priority ?? null,
        input.health ?? null,
        budgetCents,
        parseDateInput(input.startDate),
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Proyecto no encontrado')

    const nextManagerName = input.managerName?.trim() || existing.manager
    const newTeamMembers =
      input.team !== undefined
        ? collectNewTeamMembers(
            teamMembersFromDto(existing.team),
            teamMembersFromInput(input.team),
            nextManagerName,
          )
        : []

    if (input.team) {
      await client.query(`DELETE FROM crm_project_team_members WHERE project_id = $1`, [
        id,
      ])
      await insertProjectTeam(client, id, input.team, nextManagerName)
    }

    await client.query('COMMIT')
    const detail = mapProjectDetail(row, await loadProjectTeam(id))
    const previousManager = existing.manager?.trim() ?? ''
    const nextManager = detail.manager?.trim() ?? ''
    if (nextManager && nextManager !== previousManager) {
      void notifyProjectAssignment({
        actor,
        managerName: nextManager,
        projectId: detail.id,
        projectName: detail.name,
      }).catch(() => {
        /* ignore realtime errors */
      })
    }

    if (newTeamMembers.length > 0) {
      void notifyAndEmailNewProjectTeamMembers({
        actor,
        projectId: detail.id,
        projectName: detail.name,
        members: newTeamMembers,
      }).catch(() => {
        /* ignore notification errors */
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

export async function archiveProject(
  id: string,
  actor: AuditActor,
): Promise<ProjectListItem> {
  const result = await tenantQuery<ProjectRow>(
    `UPDATE crm_projects
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${PROJECT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado o ya archivado')
  return mapProjectRow(row)
}

export async function restoreProject(
  id: string,
  actor: AuditActor,
): Promise<ProjectListItem> {
  const result = await tenantQuery<ProjectRow>(
    `UPDATE crm_projects
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${PROJECT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado')
  return mapProjectRow(row)
}

/** Elimina definitivamente un proyecto archivado y su equipo. */
export async function permanentlyDeleteProject(id: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const found = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_projects
       WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NOT NULL
       FOR UPDATE`,
      [id],
    )
    if (!found.rows[0]) {
      throw notFound('Proyecto no encontrado en archivados')
    }

    await client.query(`DELETE FROM crm_project_team_members WHERE project_id = $1`, [
      id,
    ])
    await purgeEntityNotesAndFiles('proyecto', id, client)
    await client.query(`DELETE FROM crm_projects WHERE id = $1`, [id])

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
