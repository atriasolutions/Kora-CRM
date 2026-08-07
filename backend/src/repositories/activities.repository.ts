import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapActivityDetail,
  mapActivityRow,
  type ActivityRow,
} from '../mappers/activity.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  ActivityDetail,
  ActivityListItem,
  CreateActivityInput,
  UpdateActivityInput,
} from '../types/activity.js'
import { parseDatetimeInput } from '../utils/format.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import {
  broadcastActivitiesRefreshForUserName,
  notifyAssignment,
} from '../services/notifications.service.js'

const ACTIVITY_COLUMNS = `
  id, title, activity_type, type_label, related_type, related_id, related_name,
  company_name, due_at, assignee_name, status, priority, scheduled_at, reminder_at,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const TYPE_LABELS: Record<string, string> = {
  llamada: 'Llamada',
  email: 'Email',
  reunion: 'Reunión',
  nota: 'Nota',
  whatsapp: 'WhatsApp',
}

export type ListActivitiesParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  relatedType?: string
  relatedId?: string
  assigneeName?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

function typeLabelFor(activityType: string, override?: string): string {
  if (override?.trim()) return override.trim()
  return TYPE_LABELS[activityType] ?? activityType
}

async function resolveRelatedSnapshot(
  relatedType: string,
  relatedId: string,
  relatedName?: string,
  companyName?: string,
): Promise<{ relatedName: string; companyName: string }> {
  const nameOverride = relatedName?.trim()
  const companyOverride = companyName?.trim()

  const queries: Record<string, string> = {
    contacto: `SELECT name, company_name FROM crm_contacts WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    empresa: `SELECT name FROM crm_companies WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    oportunidad: `SELECT name, company_name FROM crm_opportunities WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    cotizacion: `SELECT code AS name, company_name FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    compra: `SELECT reference AS name, supplier_name AS company_name FROM crm_purchases WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    factura: `SELECT number AS name, client_name AS company_name FROM crm_invoices WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    boleta: `SELECT number AS name, buyer_name AS company_name FROM crm_boletas WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    proyecto: `SELECT name, client_name AS company_name FROM crm_projects WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    ingreso: `SELECT number AS name, supplier_name AS company_name FROM crm_stock_receipts WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    producto: `SELECT name, '' AS company_name FROM crm_products WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    inventario: `SELECT sku AS name, warehouse_name AS company_name FROM crm_inventory_positions WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
  }

  const sql = queries[relatedType]
  if (!sql) throw badRequest('Tipo de registro relacionado no válido')

  const result = await tenantQuery<{ name: string; company_name?: string }>(sql, [
    relatedId,
    getTenantIdOrDefault(),
  ])
  const row = result.rows[0]
  if (!row) throw badRequest('Registro relacionado no encontrado')

  return {
    relatedName: nameOverride || row.name || '',
    companyName: companyOverride || row.company_name || row.name || '',
  }
}

function scheduledFromInput(input: CreateActivityInput | UpdateActivityInput): Date | null {
  return parseDatetimeInput(input.scheduledAt ?? input.dueAt)
}


const ACTIVITY_SORT_COLUMNS: Record<string, string> = {
  title: 'title',
  status: 'status',
  dueAt: 'due_at',
  scheduledAt: 'scheduled_at',
  assignee: 'assignee_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export async function listActivities(
  params: ListActivitiesParams,
): Promise<{ items: ActivityListItem[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('deleted_at IS NOT NULL')
  } else {
    conditions.push('deleted_at IS NULL')
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
  if (params.relatedType) {
    conditions.push(`related_type = $${idx++}`)
    values.push(params.relatedType)
  }
  if (params.relatedId) {
    conditions.push(`related_id = $${idx++}`)
    values.push(params.relatedId)
  }
  if (params.assigneeName) {
    conditions.push(`assignee_name ILIKE $${idx++}`)
    values.push(`%${params.assigneeName}%`)
  }
  if (params.q) {
    conditions.push(
      `(title ILIKE $${idx} OR related_name ILIKE $${idx} OR company_name ILIKE $${idx} OR assignee_name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'COALESCE(due_at, scheduled_at, created_at)',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    ACTIVITY_SORT_COLUMNS,
    'COALESCE(due_at, scheduled_at, created_at) DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_activities ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<ActivityRow>(
      `SELECT ${ACTIVITY_COLUMNS}
       FROM crm_activities
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapActivityRow), total }
  })
}

export async function getActivityById(id: string): Promise<ActivityDetail> {
  const result = await tenantQuery<ActivityRow>(
    `SELECT ${ACTIVITY_COLUMNS}
     FROM crm_activities
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Actividad no encontrada')
  return mapActivityDetail(row)
}

export async function createActivity(
  input: CreateActivityInput,
  actor: AuditActor,
): Promise<ActivityDetail> {
  await enforceRecordQuota(actor)
  if (!input.title?.trim()) throw badRequest('El título es obligatorio')
  if (!input.relatedId?.trim()) throw badRequest('El registro relacionado es obligatorio')

  const related = await resolveRelatedSnapshot(
    input.relatedType,
    input.relatedId,
    input.relatedName,
    input.companyName,
  )

  const scheduled = scheduledFromInput(input) ?? new Date()
  const reminder = parseDatetimeInput(input.reminderAt)
  const result = await tenantQuery<ActivityRow>(
    `INSERT INTO crm_activities (
      title, activity_type, type_label, related_type, related_id, related_name,
      company_name, due_at, assignee_name, status, priority, scheduled_at, reminder_at,
      created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $14, $15, $16
    )
    RETURNING ${ACTIVITY_COLUMNS}`,
    [
      input.title.trim(),
      input.type,
      typeLabelFor(input.type),
      input.relatedType,
      input.relatedId,
      related.relatedName,
      related.companyName,
      scheduled,
      input.assigneeName?.trim() || actor.userName,
      input.status ?? 'Pendiente',
      input.priority ?? 'Media',
      scheduled,
      reminder,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('No se pudo crear la actividad')
  const detail = mapActivityDetail(row)

  // Notifica a la persona asignada cuando se crea una actividad.
  void notifyAssignment({
    actor,
    assigneeName: detail.assignee,
    activityId: detail.id,
    activityTitle: detail.title,
  }).catch(() => {
    /* ignore realtime errors */
  })

  void broadcastActivitiesRefreshForUserName(detail.assignee).catch(() => {
    /* ignore realtime errors */
  })

  if (input.reminder?.trim()) {
    return { ...detail, reminder: input.reminder.trim() }
  }
  return detail
}

export async function updateActivity(
  id: string,
  input: UpdateActivityInput,
  actor: AuditActor,
): Promise<ActivityDetail> {
  const existing = await getActivityById(id)

  let relatedName = existing.relatedName
  let companyName = existing.companyName
  let relatedType = existing.relatedType
  let relatedId = existing.relatedId

  const relatedChanged =
    (input.relatedType !== undefined && input.relatedType !== relatedType) ||
    (input.relatedId !== undefined && input.relatedId !== relatedId)

  if (relatedChanged) {
    relatedType = input.relatedType ?? relatedType
    relatedId = input.relatedId ?? relatedId
    const resolved = await resolveRelatedSnapshot(
      relatedType,
      relatedId,
      input.relatedName,
      input.companyName,
    )
    relatedName = resolved.relatedName
    companyName = resolved.companyName
  } else if (input.relatedName !== undefined || input.companyName !== undefined) {
    relatedName = input.relatedName?.trim() || relatedName
    companyName = input.companyName?.trim() || companyName
  }

  const scheduled =
    input.scheduledAt !== undefined || input.dueAt !== undefined
      ? scheduledFromInput(input)
      : null
  const reminder =
    input.reminderAt !== undefined ? parseDatetimeInput(input.reminderAt) : undefined

  const result = await tenantQuery<ActivityRow>(
    `UPDATE crm_activities SET
      title = COALESCE($2, title),
      activity_type = COALESCE($3, activity_type),
      type_label = COALESCE($4, type_label),
      related_type = $5,
      related_id = $6,
      related_name = $7,
      company_name = $8,
      due_at = COALESCE($9, due_at),
      assignee_name = COALESCE($10, assignee_name),
      status = COALESCE($11, status),
      priority = COALESCE($12, priority),
      scheduled_at = COALESCE($13, scheduled_at),
      reminder_at = COALESCE($14, reminder_at),
      updated_by_id = $15,
      updated_by_name = $16,
      updated_at = now()
    WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(17)}
    RETURNING ${ACTIVITY_COLUMNS}`,
    [
      id,
      input.title?.trim() || null,
      input.type ?? null,
      input.type ? typeLabelFor(input.type) : null,
      relatedType,
      relatedId,
      relatedName,
      companyName,
      scheduled,
      input.assigneeName?.trim() || null,
      input.status ?? null,
      input.priority ?? null,
      scheduled,
      reminder !== undefined ? reminder : null,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Actividad no encontrada')

  if (reminder !== undefined) {
    await tenantQuery(
      `ALTER TABLE crm_activities
       ADD COLUMN IF NOT EXISTS reminder_notified_at TIMESTAMPTZ`,
    )
    await tenantQuery(
      `UPDATE crm_activities SET reminder_notified_at = NULL WHERE id = $1`,
      [id],
    )
  }

  const detail = mapActivityDetail(row)

  void broadcastActivitiesRefreshForUserName(detail.assignee).catch(() => {
    /* ignore realtime errors */
  })

  // Notifica al nuevo asignado si cambia el usuario asignado.
  if (existing.assignee !== detail.assignee) {
    void notifyAssignment({
      actor,
      assigneeName: detail.assignee,
      activityId: detail.id,
      activityTitle: detail.title,
    }).catch(() => {
      /* ignore realtime errors */
    })
  }

  if (input.reminder !== undefined) {
    return { ...detail, reminder: input.reminder?.trim() || undefined }
  }
  return detail
}

export async function archiveActivity(
  id: string,
  actor: AuditActor,
): Promise<ActivityListItem> {
  const result = await tenantQuery<ActivityRow>(
    `UPDATE crm_activities
     SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${ACTIVITY_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Actividad no encontrada o ya archivada')
  return mapActivityRow(row)
}

export async function restoreActivity(
  id: string,
  actor: AuditActor,
): Promise<ActivityListItem> {
  const result = await tenantQuery<ActivityRow>(
    `UPDATE crm_activities
     SET deleted_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1
     RETURNING ${ACTIVITY_COLUMNS}`,
    [id, actor.userId, actor.userName],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Actividad no encontrada')
  return mapActivityRow(row)
}

export async function permanentlyDeleteActivity(id: string): Promise<void> {
  await purgeEntityNotesAndFiles('actividad', id)
  const result = await tenantQuery(
    `DELETE FROM crm_activities WHERE id = $1 AND deleted_at IS NOT NULL`,
    [id],
  )
  if ((result.rowCount ?? 0) === 0) {
    throw notFound('Actividad no encontrada en archivados')
  }
}

/** Actividades vinculadas a un registro (para paneles de entidad). */
export async function listActivitiesForRelated(
  relatedType: string,
  relatedId: string,
  limit = 50,
): Promise<ActivityListItem[]> {
  const result = await tenantQuery<ActivityRow>(
    `SELECT ${ACTIVITY_COLUMNS}
     FROM crm_activities
     WHERE deleted_at IS NULL AND related_type = $1 AND related_id = $2
     ORDER BY COALESCE(due_at, scheduled_at, created_at) DESC
     LIMIT $3`,
    [relatedType, relatedId, limit],
  )
  return result.rows.map(mapActivityRow)
}
