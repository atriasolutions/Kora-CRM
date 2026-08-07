import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import { chilePartsFromDate } from '../lib/chile-timezone.js'
import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapBitacoraDetail,
  mapBitacoraRow,
  type BitacoraRow,
} from '../mappers/bitacora.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import { getCompanyMonthlyAssignedHours } from '../repositories/companies.repository.js'
import { loadTenantScopedUserRow } from '../repositories/users.repository.js'
import type { AuditActor } from '../types/audit.js'
import type {
  BitacoraDashboardMonthlyQuota,
  BitacoraDashboardStats,
  BitacoraDetail,
  BitacoraListItem,
  CreateBitacoraInput,
  UpdateBitacoraInput,
} from '../types/bitacora.js'
import { parseDateInput } from '../utils/format.js'
import { paginationOffset } from '../utils/pagination.js'
import { resolveOrderByClause } from '../lib/list-query.js'

const BITACORA_COLUMNS = `
  id, solicitud_id, solicitud_code, solicitud_title,
  work_date, hours, description, is_billable, non_billable_reason,
  assigned_user_id, assigned_user_name,
  company_id, company_name,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

export type ListBitacoraParams = {
  page: number
  pageSize: number
  q?: string
  solicitudId?: string
  assignedUserId?: string
  isBillable?: boolean
  workDateFrom?: string
  workDateTo?: string
  companyId?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

const BITACORA_SORT_COLUMNS: Record<string, string> = {
  workDate: 'work_date',
  hours: 'hours',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  companyName: 'company_name',
}

async function resolveSolicitudSnapshot(
  solicitudId: string,
): Promise<{
  code: string
  title: string
  companyId: string | null
  companyName: string
}> {
  const result = await tenantQuery<{
    code: string
    title: string
    company_id: string | null
    company_name: string | null
  }>(
    `SELECT code, title, company_id, company_name
     FROM crm_solicitudes
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [solicitudId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Solicitud no encontrada')
  return {
    code: row.code ?? '',
    title: row.title ?? '',
    companyId: row.company_id ?? null,
    companyName: row.company_name?.trim() ?? '',
  }
}

export async function getSolicitudCompanySnapshot(
  solicitudId: string,
): Promise<{ companyId: string | null; companyName: string }> {
  const snap = await resolveSolicitudSnapshot(solicitudId)
  return { companyId: snap.companyId, companyName: snap.companyName }
}

async function resolveAssignedUser(
  userId: string,
  userName?: string,
): Promise<{ id: string; name: string }> {
  const tenantId = getTenantIdOrDefault()
  const row = await loadTenantScopedUserRow(userId.trim(), tenantId)
  const name = row?.name?.trim() || userName?.trim() || ''
  if (!row || !name) throw badRequest('Usuario asignado no encontrado')
  return { id: userId.trim(), name }
}

function buildListWhere(params: ListBitacoraParams): {
  where: string
  values: unknown[]
} {
  const conditions = [params.archivedOnly ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  idx = pushTenantCondition(conditions, values, idx)

  if (params.solicitudId) {
    conditions.push(`solicitud_id = $${idx++}`)
    values.push(params.solicitudId)
  }

  if (params.assignedUserId) {
    conditions.push(`assigned_user_id = $${idx++}`)
    values.push(params.assignedUserId)
  }

  if (params.isBillable !== undefined) {
    conditions.push(`is_billable = $${idx++}`)
    values.push(params.isBillable)
  }

  if (params.workDateFrom) {
    conditions.push(`work_date >= $${idx++}`)
    values.push(params.workDateFrom)
  }

  if (params.workDateTo) {
    conditions.push(`work_date <= $${idx++}`)
    values.push(params.workDateTo)
  }

  if (params.companyId) {
    conditions.push(`company_id = $${idx++}`)
    values.push(params.companyId)
  }

  const q = params.q?.trim()
  if (q) {
    conditions.push(`(
      solicitud_code ILIKE $${idx}
      OR solicitud_title ILIKE $${idx}
      OR description ILIKE $${idx}
      OR assigned_user_name ILIKE $${idx}
      OR company_name ILIKE $${idx}
    )`)
    values.push(`%${q}%`)
    idx++
  }

  return { where: `WHERE ${conditions.join(' AND ')}`, values }
}

export async function listBitacora(
  params: ListBitacoraParams,
): Promise<{ items: BitacoraListItem[]; total: number }> {
  const { where, values } = buildListWhere(params)
  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    BITACORA_SORT_COLUMNS,
    'work_date DESC, created_at DESC',
  )

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_bitacora_entries ${where}`,
      values,
    )
    const total = Number(countResult.rows[0]?.count ?? 0)

    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]
    const result = await client.query<BitacoraRow>(
      `SELECT ${BITACORA_COLUMNS}
       FROM crm_bitacora_entries
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      listValues,
    )

    return { items: result.rows.map(mapBitacoraRow), total }
  })
}

export async function listBitacoraForSolicitud(
  solicitudId: string,
): Promise<BitacoraListItem[]> {
  const result = await tenantQuery<BitacoraRow>(
    `SELECT ${BITACORA_COLUMNS}
     FROM crm_bitacora_entries
     WHERE solicitud_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}
     ORDER BY work_date DESC, created_at DESC`,
    [solicitudId, getTenantIdOrDefault()],
  )
  return result.rows.map(mapBitacoraRow)
}

export async function getBitacoraById(id: string): Promise<BitacoraDetail> {
  const result = await tenantQuery<BitacoraRow>(
    `SELECT ${BITACORA_COLUMNS}
     FROM crm_bitacora_entries
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Registro de bitácora no encontrado')
  return mapBitacoraDetail(row)
}

export async function createBitacora(
  input: CreateBitacoraInput,
  actor: AuditActor,
): Promise<BitacoraDetail> {
  await enforceRecordQuota(actor)

  const solicitud = await resolveSolicitudSnapshot(input.solicitudId)
  const assigned = await resolveAssignedUser(input.assignedUserId, input.assignedUserName)
  const workDate = parseDateInput(input.workDate)
  if (!workDate) throw badRequest('Fecha de bitácora inválida')

  const isBillable = input.isBillable !== false
  const nonBillableReason = isBillable
    ? null
    : input.nonBillableReason?.trim() || null
  if (!isBillable && !nonBillableReason) {
    throw badRequest('Indique el motivo cuando las horas no son facturables')
  }

  const result = await tenantQuery<BitacoraRow>(
    `INSERT INTO crm_bitacora_entries (
      tenant_id, solicitud_id, solicitud_code, solicitud_title,
      work_date, hours, description, is_billable, non_billable_reason,
      assigned_user_id, assigned_user_name,
      company_id, company_name,
      created_by_id, created_by_name, updated_by_id, updated_by_name
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9,
      $10, $11,
      $12, $13,
      $14, $15, $14, $15
    )
    RETURNING ${BITACORA_COLUMNS}`,
    [
      getTenantIdOrDefault(),
      input.solicitudId,
      solicitud.code,
      solicitud.title,
      workDate,
      input.hours,
      input.description?.trim() ?? '',
      isBillable,
      nonBillableReason,
      assigned.id,
      assigned.name,
      solicitud.companyId,
      solicitud.companyName,
      actor.userId,
      actor.userName,
    ],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('No se pudo crear el registro de bitácora')
  return mapBitacoraDetail(row)
}

export async function updateBitacora(
  id: string,
  input: UpdateBitacoraInput,
  actor: AuditActor,
): Promise<BitacoraDetail> {
  const existing = await getBitacoraById(id)

  let solicitudId = existing.solicitudId
  let solicitudCode = existing.solicitudCode
  let solicitudTitle = existing.solicitudTitle
  let companyId = existing.companyId ?? null
  let companyName = existing.companyName ?? ''
  if (input.solicitudId && input.solicitudId !== existing.solicitudId) {
    const solicitud = await resolveSolicitudSnapshot(input.solicitudId)
    solicitudId = input.solicitudId
    solicitudCode = solicitud.code
    solicitudTitle = solicitud.title
    companyId = solicitud.companyId
    companyName = solicitud.companyName
  }

  let assignedUserId = existing.assignedUserId
  let assignedUserName = existing.assignedUserName
  if (input.assignedUserId) {
    const assigned = await resolveAssignedUser(input.assignedUserId, input.assignedUserName)
    assignedUserId = assigned.id
    assignedUserName = assigned.name
  }

  let workDate = existing.workDate
  if (input.workDate !== undefined) {
    const parsed = parseDateInput(input.workDate)
    if (!parsed) throw badRequest('Fecha de bitácora inválida')
    workDate = parsed
  }

  const hours = input.hours ?? existing.hours
  const description =
    input.description !== undefined ? input.description.trim() : existing.description
  const isBillable = input.isBillable ?? existing.isBillable
  let nonBillableReason = existing.nonBillableReason
  if (isBillable) {
    nonBillableReason = null
  } else if (input.nonBillableReason !== undefined) {
    nonBillableReason = input.nonBillableReason.trim() || null
  }
  if (!isBillable && !nonBillableReason?.trim()) {
    throw badRequest('Indique el motivo cuando las horas no son facturables')
  }

  const result = await tenantQuery<BitacoraRow>(
    `UPDATE crm_bitacora_entries SET
      solicitud_id = $1,
      solicitud_code = $2,
      solicitud_title = $3,
      work_date = $4,
      hours = $5,
      description = $6,
      is_billable = $7,
      non_billable_reason = $8,
      assigned_user_id = $9,
      assigned_user_name = $10,
      company_id = $11,
      company_name = $12,
      updated_at = now(),
      updated_by_id = $13,
      updated_by_name = $14
     WHERE id = $15 AND deleted_at IS NULL AND ${tenantWhereParam(16)}
     RETURNING ${BITACORA_COLUMNS}`,
    [
      solicitudId,
      solicitudCode,
      solicitudTitle,
      workDate,
      hours,
      description,
      isBillable,
      nonBillableReason,
      assignedUserId || null,
      assignedUserName,
      companyId,
      companyName,
      actor.userId,
      actor.userName,
      id,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Registro de bitácora no encontrado')
  return mapBitacoraDetail(row)
}

export type BitacoraDashboardParams = {
  assignedUserId?: string
  workDateFrom?: string
  workDateTo?: string
  companyId?: string
}

const DASHBOARD_MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function roundHours(value: number): number {
  return Math.round(value * 10) / 10
}

function buildDashboardPeriodLabel(params: BitacoraDashboardParams): string {
  if (params.workDateFrom && params.workDateTo) {
    if (params.workDateFrom === params.workDateTo) return params.workDateFrom
    return `${params.workDateFrom} – ${params.workDateTo}`
  }
  if (params.workDateFrom) return `Desde ${params.workDateFrom}`
  if (params.workDateTo) return `Hasta ${params.workDateTo}`
  return 'Todo el historial'
}

function monthLabelFromKey(key: string): string {
  const [year, month] = key.split('-')
  const monthIndex = Number.parseInt(month ?? '', 10) - 1
  if (!year || monthIndex < 0 || monthIndex > 11) return key
  return `${DASHBOARD_MONTH_LABELS[monthIndex]} ${year}`
}

async function resolveDashboardCompanyName(companyId?: string): Promise<string | undefined> {
  if (!companyId) return undefined
  const result = await tenantQuery<{ name: string }>(
    `SELECT name FROM crm_companies
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [companyId, getTenantIdOrDefault()],
  )
  return result.rows[0]?.name?.trim() || undefined
}

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function resolveQuotaMonthBounds(params: BitacoraDashboardParams): {
  from: string
  to: string
  label: string
  monthKey: string
} {
  if (params.workDateFrom && params.workDateTo) {
    const fromMonth = params.workDateFrom.slice(0, 7)
    const toMonth = params.workDateTo.slice(0, 7)
    if (fromMonth === toMonth && /^\d{4}-\d{2}$/.test(fromMonth)) {
      const [year, month] = fromMonth.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      return {
        from: `${fromMonth}-01`,
        to: padDate(year, month, lastDay),
        label: monthLabelFromKey(fromMonth),
        monthKey: fromMonth,
      }
    }
  }

  const chile = chilePartsFromDate(new Date())
  const lastDay = new Date(chile.year, chile.month, 0).getDate()
  const monthKey = `${chile.year}-${String(chile.month).padStart(2, '0')}`
  return {
    from: `${monthKey}-01`,
    to: padDate(chile.year, chile.month, lastDay),
    label: monthLabelFromKey(monthKey),
    monthKey,
  }
}

/** Porcentaje de avance del mes calendario (100 % en meses pasados). */
function resolveMonthProgressPercent(monthKey: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) return 100

  const year = Number(match[1])
  const month = Number(match[2])
  if (!year || month < 1 || month > 12) return 100

  const chile = chilePartsFromDate(new Date())
  const quotaOrdinal = year * 100 + month
  const currentOrdinal = chile.year * 100 + chile.month

  if (quotaOrdinal < currentOrdinal) return 100
  if (quotaOrdinal > currentOrdinal) return 0

  const daysInMonth = new Date(year, month, 0).getDate()
  if (daysInMonth <= 0) return 100
  return Math.round((chile.day / daysInMonth) * 1000) / 10
}

async function resolveMonthlyQuota(
  params: BitacoraDashboardParams,
): Promise<BitacoraDashboardMonthlyQuota | null> {
  if (!params.companyId) return null

  const assignedHours = await getCompanyMonthlyAssignedHours(params.companyId)
  if (assignedHours == null) return null

  const monthBounds = resolveQuotaMonthBounds(params)
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ total_hours: string }>(
    `SELECT coalesce(sum(hours), 0)::text AS total_hours
     FROM crm_bitacora_entries
     WHERE deleted_at IS NULL
       AND company_id = $1
       AND tenant_id = $2
       AND work_date >= $3::date
       AND work_date <= $4::date`,
    [params.companyId, tenantId, monthBounds.from, monthBounds.to],
  )
  const usedHours = roundHours(Number(result.rows[0]?.total_hours ?? 0))
  const utilizationPercent =
    assignedHours > 0
      ? Math.round((usedHours / assignedHours) * 1000) / 10
      : 0

  return {
    assignedHours,
    usedHours,
    utilizationPercent,
    monthProgressPercent: resolveMonthProgressPercent(monthBounds.monthKey),
    monthLabel: monthBounds.label,
  }
}

export function emptyBitacoraDashboardStats(
  periodLabel: string,
  companyName?: string,
): BitacoraDashboardStats {
  return {
    billableHours: 0,
    nonBillableHours: 0,
    totalHours: 0,
    entryCount: 0,
    billableSharePercent: 0,
    periodLabel,
    companyName,
    byMonth: [],
    bySolicitud: [],
    byCompany: [],
    byUser: [],
  }
}

export async function getBitacoraDashboardStats(
  params: BitacoraDashboardParams,
): Promise<BitacoraDashboardStats> {
  const { where, values } = buildListWhere({
    page: 1,
    pageSize: 1,
    assignedUserId: params.assignedUserId,
    workDateFrom: params.workDateFrom,
    workDateTo: params.workDateTo,
    companyId: params.companyId,
  })

  const totalsResult = await tenantQuery<{
    billable_hours: string
    non_billable_hours: string
    entry_count: string
  }>(
    `SELECT
      coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable_hours,
      coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable_hours,
      count(*)::text AS entry_count
     FROM crm_bitacora_entries ${where}`,
    values,
  )
  const totalsRow = totalsResult.rows[0]
  const billableHours = roundHours(Number(totalsRow?.billable_hours ?? 0))
  const nonBillableHours = roundHours(Number(totalsRow?.non_billable_hours ?? 0))
  const totalHours = roundHours(billableHours + nonBillableHours)
  const entryCount = Number(totalsRow?.entry_count ?? 0)
  const billableSharePercent =
    totalHours > 0 ? Math.round((billableHours / totalHours) * 1000) / 10 : 0

  const monthResult = await tenantQuery<{
    month_key: string
    billable_hours: string
    non_billable_hours: string
  }>(
    `SELECT
      to_char(work_date, 'YYYY-MM') AS month_key,
      coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable_hours,
      coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable_hours
     FROM crm_bitacora_entries ${where}
     GROUP BY 1
     ORDER BY 1`,
    values,
  )

  const solicitudResult = await tenantQuery<{
    solicitud_id: string
    solicitud_code: string
    solicitud_title: string
    billable_hours: string
    non_billable_hours: string
    total_hours: string
  }>(
    `SELECT
      solicitud_id,
      solicitud_code,
      solicitud_title,
      coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable_hours,
      coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable_hours,
      coalesce(sum(hours), 0)::text AS total_hours
     FROM crm_bitacora_entries ${where}
     GROUP BY solicitud_id, solicitud_code, solicitud_title
     ORDER BY sum(hours) DESC
     LIMIT 8`,
    values,
  )

  const userResult = await tenantQuery<{
    assigned_user_id: string
    assigned_user_name: string
    billable_hours: string
    non_billable_hours: string
    total_hours: string
    entry_count: string
  }>(
    `SELECT
      assigned_user_id,
      assigned_user_name,
      coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable_hours,
      coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable_hours,
      coalesce(sum(hours), 0)::text AS total_hours,
      count(*)::text AS entry_count
     FROM crm_bitacora_entries ${where}
     GROUP BY assigned_user_id, assigned_user_name
     ORDER BY sum(hours) DESC
     LIMIT 12`,
    values,
  )

  let byCompany: BitacoraDashboardStats['byCompany'] = []
  if (!params.companyId) {
    const companyResult = await tenantQuery<{
      company_id: string | null
      company_name: string | null
      billable_hours: string
      non_billable_hours: string
      total_hours: string
    }>(
      `SELECT
        company_id,
        company_name,
        coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable_hours,
        coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable_hours,
        coalesce(sum(hours), 0)::text AS total_hours
       FROM crm_bitacora_entries ${where}
         AND company_id IS NOT NULL
         AND btrim(coalesce(company_name, '')) <> ''
       GROUP BY company_id, company_name
       ORDER BY sum(hours) DESC
       LIMIT 6`,
      values,
    )
    byCompany = companyResult.rows.map((row) => ({
      companyId: row.company_id ?? '',
      companyName: row.company_name?.trim() || '—',
      billableHours: roundHours(Number(row.billable_hours)),
      nonBillableHours: roundHours(Number(row.non_billable_hours)),
      totalHours: roundHours(Number(row.total_hours)),
    }))
  }

  const companyName =
    (await resolveDashboardCompanyName(params.companyId)) ??
    (params.companyId ? byCompany[0]?.companyName : undefined)

  const monthlyQuota = await resolveMonthlyQuota(params)

  return {
    billableHours,
    nonBillableHours,
    totalHours,
    entryCount,
    billableSharePercent,
    periodLabel: buildDashboardPeriodLabel(params),
    companyId: params.companyId,
    companyName,
    monthlyQuota,
    byMonth: monthResult.rows.map((row) => {
      const billable = roundHours(Number(row.billable_hours))
      const nonBillable = roundHours(Number(row.non_billable_hours))
      return {
        key: row.month_key,
        label: monthLabelFromKey(row.month_key),
        billableHours: billable,
        nonBillableHours: nonBillable,
        totalHours: roundHours(billable + nonBillable),
      }
    }),
    bySolicitud: solicitudResult.rows.map((row) => ({
      solicitudId: row.solicitud_id,
      code: row.solicitud_code,
      title: row.solicitud_title,
      billableHours: roundHours(Number(row.billable_hours)),
      nonBillableHours: roundHours(Number(row.non_billable_hours)),
      totalHours: roundHours(Number(row.total_hours)),
    })),
    byCompany,
    byUser: userResult.rows.map((row) => ({
      assignedUserId: row.assigned_user_id,
      assignedUserName: row.assigned_user_name?.trim() || '—',
      billableHours: roundHours(Number(row.billable_hours)),
      nonBillableHours: roundHours(Number(row.non_billable_hours)),
      totalHours: roundHours(Number(row.total_hours)),
      entryCount: Number(row.entry_count ?? 0),
    })),
  }
}

export async function archiveBitacora(
  id: string,
  actor: AuditActor,
): Promise<BitacoraListItem> {
  const result = await tenantQuery<BitacoraRow>(
    `UPDATE crm_bitacora_entries SET
      deleted_at = now(),
      updated_at = now(),
      updated_by_id = $1,
      updated_by_name = $2
     WHERE id = $3 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${BITACORA_COLUMNS}`,
    [actor.userId, actor.userName, id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Registro de bitácora no encontrado o ya archivado')
  return mapBitacoraRow(row)
}

/** @deprecated Usar archiveBitacora */
export async function deleteBitacora(id: string, actor: AuditActor): Promise<void> {
  await archiveBitacora(id, actor)
}

export async function restoreBitacora(
  id: string,
  actor: AuditActor,
): Promise<BitacoraListItem> {
  const result = await tenantQuery<BitacoraRow>(
    `UPDATE crm_bitacora_entries SET
      deleted_at = NULL,
      updated_at = now(),
      updated_by_id = $1,
      updated_by_name = $2
     WHERE id = $3 AND deleted_at IS NOT NULL AND ${tenantWhereParam(4)}
     RETURNING ${BITACORA_COLUMNS}`,
    [actor.userId, actor.userName, id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Registro de bitácora no encontrado en archivados')
  return mapBitacoraRow(row)
}

export async function permanentlyDeleteBitacora(id: string): Promise<void> {
  const result = await tenantQuery(
    `DELETE FROM crm_bitacora_entries
     WHERE id = $1 AND deleted_at IS NOT NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  if ((result.rowCount ?? 0) === 0) {
    throw notFound('Registro de bitácora no encontrado en archivados')
  }
}
