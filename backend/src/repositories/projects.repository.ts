import type { PoolClient } from 'pg'

import { getCompanyLinkById } from '../repositories/companies.repository.js'
import {
  resolveOpportunitySnapshot,
} from '../lib/relation-snapshots.js'
import { pool } from '../db/pool.js'
import {
  mapProjectDetail,
  mapProjectRow,
  type ProjectRow,
  type ProjectTeamRow,
} from '../mappers/project.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import { notifyProjectAssignment } from '../services/notifications.service.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectListItem,
  ProjectTeamMemberInput,
  UpdateProjectInput,
} from '../types/project.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents, parsePercentToInt } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'

const PROJECT_COLUMNS = `
  id, name, client_name, customer_kind, company_id, contact_id,
  opportunity_id, opportunity_name,
  accepted_quote_id, quote_code, progress_pct, deadline, manager_name,
  journey_stage, status, priority, health, budget_cents, start_date,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const TEAM_COLUMNS = `id, project_id, user_id, user_name, role_label`

export type ListProjectsParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  opportunityId?: string
  companyId?: string
  archivedOnly?: boolean
}

async function loadProjectTeam(projectId: string): Promise<ProjectTeamRow[]> {
  const result = await pool.query<ProjectTeamRow>(
    `SELECT ${TEAM_COLUMNS}
     FROM crm_project_team_members
     WHERE project_id = $1
     ORDER BY user_name ASC, id ASC`,
    [projectId],
  )
  return result.rows
}

function resolveProgressPct(input: CreateProjectInput | UpdateProjectInput): number | null {
  if (input.progressPct != null) return input.progressPct
  if (input.progressNum != null) return input.progressNum
  if (input.progress != null) return parsePercentToInt(input.progress) ?? 0
  return null
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
  const result = await pool.query<{ id: string; code: string; opportunity_id: string | null }>(
    `SELECT id, code, opportunity_id FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL`,
    [quoteId],
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
  const result = await pool.query<{ opportunity_id: string | null }>(
    `SELECT opportunity_id FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL`,
    [acceptedQuoteId],
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
    const result = await pool.query<{ name: string }>(
      `SELECT name FROM crm_contacts WHERE id = $1 AND deleted_at IS NULL`,
      [contactId],
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
  const byName = await pool.query<{ id: string; name: string }>(
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
    const oppRow = await pool.query<{
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

async function insertProjectTeam(
  client: PoolClient,
  projectId: string,
  team: ProjectTeamMemberInput[] | undefined,
  managerName: string,
): Promise<void> {
  const members =
    team && team.length > 0
      ? team
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
  if (params.status) {
    conditions.push(`status = $${idx++}`)
    values.push(params.status)
  }
  if (params.opportunityId) {
    conditions.push(`opportunity_id = $${idx++}`)
    values.push(params.opportunityId)
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

  const where = `WHERE ${conditions.join(' AND ')}`
  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_projects ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await pool.query<ProjectRow>(
    `SELECT ${PROJECT_COLUMNS}
     FROM crm_projects
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return { items: result.rows.map(mapProjectRow), total }
}

export async function getProjectById(id: string): Promise<ProjectDetail> {
  const result = await pool.query<ProjectRow>(
    `SELECT ${PROJECT_COLUMNS}
     FROM crm_projects
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado')
  return mapProjectDetail(row, await loadProjectTeam(id))
}

export async function createProject(
  input: CreateProjectInput,
  actor: AuditActor,
): Promise<ProjectDetail> {
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
  const links = await resolveCommercialLinks({
    companyId: input.companyId ?? clientFields.companyId,
    client: clientFields.clientName,
    opportunityId: input.opportunityId,
    acceptedQuoteId: input.acceptedQuoteId,
  })
  if (!links.clientName) throw badRequest('El cliente es obligatorio')
  const { customerKind, contactId } = clientFields

  const progressPct = resolveProgressPct(input) ?? 0
  const budgetCents = resolveBudgetCents(input)
  const managerName = input.managerName?.trim() || actor.userName

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<ProjectRow>(
      `INSERT INTO crm_projects (
        name, client_name, customer_kind, company_id, contact_id,
        opportunity_id, opportunity_name,
        accepted_quote_id, quote_code, progress_pct, deadline, manager_name,
        journey_stage, status, priority, health, budget_cents, start_date,
        created_by_id, created_by_name, updated_by_id, updated_by_name
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $19, $20
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
        progressPct,
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
    clientInputTouched
      ? await resolveCommercialLinks({
          companyId: input.companyId ?? clientFields?.companyId ?? existing.companyId ?? null,
          client: clientFields?.clientName ?? input.client ?? existing.client,
          opportunityId,
          acceptedQuoteId,
        })
      : {
          companyId: existing.companyId ?? null,
          clientName: existing.client,
          opportunityId: existing.opportunityId ?? null,
          opportunityName: existing.opportunityName ?? '',
          acceptedQuoteId: existing.acceptedQuoteId ?? null,
          quoteCode: existing.acceptedQuoteCode ?? '',
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

  const progressPct = resolveProgressPct(input)
  const budgetCents = resolveBudgetCents(input)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
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
        progress_pct = COALESCE($11, progress_pct),
        deadline = COALESCE($12, deadline),
        manager_name = COALESCE($13, manager_name),
        journey_stage = COALESCE($14, journey_stage),
        status = COALESCE($15, status),
        priority = COALESCE($16, priority),
        health = COALESCE($17, health),
        budget_cents = COALESCE($18, budget_cents),
        start_date = COALESCE($19, start_date),
        updated_by_id = $20,
        updated_by_name = $21,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL
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
        progressPct,
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
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Proyecto no encontrado')

    if (input.team) {
      await client.query(`DELETE FROM crm_project_team_members WHERE project_id = $1`, [
        id,
      ])
      await insertProjectTeam(
        client,
        id,
        input.team,
        input.managerName?.trim() || existing.manager,
      )
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
  const result = await pool.query<ProjectRow>(
    `UPDATE crm_projects
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL
     RETURNING ${PROJECT_COLUMNS}`,
    [id, actor.userId, actor.userName],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Proyecto no encontrado o ya archivado')
  return mapProjectRow(row)
}

export async function restoreProject(
  id: string,
  actor: AuditActor,
): Promise<ProjectListItem> {
  const result = await pool.query<ProjectRow>(
    `UPDATE crm_projects
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${PROJECT_COLUMNS}`,
    [id, actor.userId, actor.userName],
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
