import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapPayrollRow,
  mapVacationRow,
  mapWorkerRow,
  type WorkerPayrollRow,
  type WorkerRow,
  type WorkerVacationRow,
} from '../mappers/worker.mapper.js'
import {
  maybeNotifyRecordOwnerChange,
  maybeNotifyRecordOwnerOnCreate,
} from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreatePayrollInput,
  CreateVacationInput,
  CreateWorkerInput,
  ListWorkersParams,
  UpdateVacationInput,
  UpdateWorkerInput,
  WorkerDetail,
  WorkerListItem,
  WorkerPayrollListItem,
  WorkerVacationRequest,
} from '../types/worker.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'
import {
  pushInListCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import { computeVacationSummary, daysBetweenInclusive } from '../lib/worker-vacation.js'
import { computePayroll } from '../lib/worker-payroll.js'

const WORKER_COLUMNS = `
  id, number, full_name, tax_id, email, phone, address, avatar_url,
  job_title, business_unit, job_functions, status, contract_type, work_hours,
  start_date, end_date, base_salary_cents, gratification_cents,
  afp_name, afp_rate, health_institution, health_plan, afc_rate,
  vacation_adjustment_days, payday_day, owner_name,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const VACATION_COLUMNS = `
  id, worker_id, start_date, end_date, days, status, notes,
  created_at, created_by_name
`

const PAYROLL_COLUMNS = `
  id, worker_id, period_year, period_month, days_worked, days_license,
  days_absence, days_vacation, uf_value_cents, earnings_json, deductions_json,
  taxable_base_cents, tax_base_cents, gross_cents, net_cents, overdraft_cents,
  paid_at, pdf_path, created_at, created_by_name
`

const WORKER_SORT_COLUMNS: Record<string, string> = {
  number: 'number',
  fullName: 'full_name',
  jobTitle: 'job_title',
  businessUnit: 'business_unit',
  status: 'status',
  contractType: 'contract_type',
  baseSalary: 'base_salary_cents',
  startDate: 'start_date',
  owner: 'owner_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export type { ListWorkersParams } from '../types/worker.js'

async function nextWorkerNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `TRB-${year}-`
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ number: string }>(
    `SELECT number FROM crm_workers
     WHERE number LIKE $1 AND ${tenantWhereParam(2)}
     ORDER BY number DESC
     LIMIT 1`,
    [`${prefix}%`, tenantId],
  )
  const last = result.rows[0]?.number
  let seq = 1
  if (last) {
    const n = Number.parseInt(last.slice(prefix.length), 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

function resolveSalaryCents(input: {
  baseSalaryCents?: number
  baseSalaryNum?: number
  baseSalary?: string
}): number | undefined {
  if (input.baseSalaryCents != null) return Math.max(0, Math.round(input.baseSalaryCents))
  if (input.baseSalaryNum != null) return Math.max(0, Math.round(input.baseSalaryNum * 100))
  if (input.baseSalary != null) return Math.max(0, parseMoneyToCents(input.baseSalary))
  return undefined
}

function resolveGratificationCents(input: {
  gratificationCents?: number
  gratificationNum?: number
  gratification?: string
}): number | undefined {
  if (input.gratificationCents != null) return Math.max(0, Math.round(input.gratificationCents))
  if (input.gratificationNum != null) return Math.max(0, Math.round(input.gratificationNum * 100))
  if (input.gratification != null) return Math.max(0, parseMoneyToCents(input.gratification))
  return undefined
}

// ── Listado ────────────────────────────────────────────────────────────────
export async function listWorkers(
  params: ListWorkersParams,
): Promise<{ items: WorkerListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }

  pushTenantCondition(conditions, values, idx)
  idx = values.length + 1

  idx = pushInListCondition(conditions, values, idx, 'status', params.status)
  idx = pushInListCondition(conditions, values, idx, 'contract_type', params.contractType)

  if (params.businessUnit?.trim()) {
    conditions.push(`business_unit = $${idx++}`)
    values.push(params.businessUnit.trim())
  }

  if (params.ownerName?.trim()) {
    conditions.push(`owner_name = $${idx++}`)
    values.push(params.ownerName.trim())
  }

  if (params.q?.trim()) {
    const pattern = `%${params.q.trim()}%`
    conditions.push(
      `(number ILIKE $${idx} OR full_name ILIKE $${idx} OR tax_id ILIKE $${idx} OR job_title ILIKE $${idx} OR business_unit ILIKE $${idx} OR email ILIKE $${idx})`,
    )
    values.push(pattern)
    idx++
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    WORKER_SORT_COLUMNS,
    'updated_at DESC',
  )

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_workers ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<WorkerRow>(
      `SELECT ${WORKER_COLUMNS}
       FROM crm_workers
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )
    return { items: result.rows.map(mapWorkerRow), total }
  })
}

async function loadWorkerRow(id: string): Promise<WorkerRow> {
  const result = await tenantQuery<WorkerRow>(
    `SELECT ${WORKER_COLUMNS}
     FROM crm_workers
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Trabajador no encontrado')
  return row
}

// ── Detalle (ficha + vacaciones + liquidaciones) ──────────────────────────────
export async function getWorkerById(id: string): Promise<WorkerDetail> {
  const worker = mapWorkerRow(await loadWorkerRow(id))
  const [vacations, payrolls] = await Promise.all([
    listVacations(id),
    listPayrolls(id),
  ])

  const approvedVacationDays = vacations
    .filter((v) => v.status === 'Aprobada')
    .reduce((sum, v) => sum + v.days, 0)
  const payrollVacationDays = payrolls.reduce((sum, p) => sum + p.daysVacation, 0)

  const vacationSummary = computeVacationSummary({
    startDateIso: worker.startDateIso || null,
    adjustmentDays: worker.vacationAdjustmentDays,
    approvedVacationDays,
    payrollVacationDays,
  })

  return { ...worker, vacationSummary, vacations, payrolls }
}

export async function createWorker(
  input: CreateWorkerInput,
  actor: AuditActor,
): Promise<WorkerDetail> {
  await enforceRecordQuota(actor)

  const fullName = input.fullName?.trim() || ''
  if (!fullName) throw badRequest('Indica el nombre del trabajador')

  const number = input.number?.trim() || (await nextWorkerNumber())
  const baseSalaryCents = resolveSalaryCents(input) ?? 0
  const gratificationCents = resolveGratificationCents(input) ?? 0

  const result = await tenantQuery<WorkerRow>(
    `INSERT INTO crm_workers (
      number, full_name, tax_id, email, phone, address, avatar_url,
      job_title, business_unit, job_functions, status, contract_type, work_hours,
      start_date, end_date, base_salary_cents, gratification_cents,
      afp_name, afp_rate, health_institution, health_plan, afc_rate,
      vacation_adjustment_days, payday_day, owner_name,
      created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17,
      $18, $19, $20, $21, $22,
      $23, $24, $25,
      $26, $27, $26, $27, $28
    )
    RETURNING ${WORKER_COLUMNS}`,
    [
      number,
      fullName,
      input.taxId?.trim() || '',
      input.email?.trim() || '',
      input.phone?.trim() || '',
      input.address?.trim() || '',
      input.avatarUrl?.trim() || null,
      input.jobTitle?.trim() || '',
      input.businessUnit?.trim() || '',
      input.jobFunctions?.trim() || null,
      input.status ?? 'Activo',
      input.contractType ?? 'Indefinido',
      input.workHours ?? 45,
      parseDateInput(input.startDate ?? '') ?? null,
      input.endDate ? parseDateInput(input.endDate) : null,
      baseSalaryCents,
      gratificationCents,
      input.afpName?.trim() || '',
      input.afpRate ?? 11.44,
      input.healthInstitution?.trim() || '',
      input.healthPlan?.trim() || '',
      input.afcRate ?? 0.6,
      input.vacationAdjustmentDays ?? 0,
      input.paydayDay ?? 5,
      input.ownerName?.trim() || actor.userName,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )

  const detail = await getWorkerById(result.rows[0]!.id)
  maybeNotifyRecordOwnerOnCreate({
    actor,
    nextOwner: detail.owner ?? '',
    moduleLabel: 'el trabajador',
    recordTitle: detail.fullName || detail.number || detail.id,
    href: `/trabajadores/${detail.id}`,
    entityType: 'trabajador',
    entityId: detail.id,
  })
  return detail
}

export async function updateWorker(
  id: string,
  input: UpdateWorkerInput,
  actor: AuditActor,
): Promise<WorkerDetail> {
  const existing = await loadWorkerRow(id)
  const previousOwner = existing.owner_name?.trim() || ''

  const baseSalaryCents = resolveSalaryCents(input)
  const gratificationCents = resolveGratificationCents(input)

  const result = await tenantQuery<WorkerRow>(
    `UPDATE crm_workers SET
      number = COALESCE($2, number),
      full_name = COALESCE($3, full_name),
      tax_id = COALESCE($4, tax_id),
      email = COALESCE($5, email),
      phone = COALESCE($6, phone),
      address = COALESCE($7, address),
      avatar_url = $8,
      job_title = COALESCE($9, job_title),
      business_unit = COALESCE($10, business_unit),
      job_functions = $11,
      status = COALESCE($12, status),
      contract_type = COALESCE($13, contract_type),
      work_hours = COALESCE($14, work_hours),
      start_date = COALESCE($15, start_date),
      end_date = $16,
      base_salary_cents = COALESCE($17, base_salary_cents),
      gratification_cents = COALESCE($18, gratification_cents),
      afp_name = COALESCE($19, afp_name),
      afp_rate = COALESCE($20, afp_rate),
      health_institution = COALESCE($21, health_institution),
      health_plan = COALESCE($22, health_plan),
      afc_rate = COALESCE($23, afc_rate),
      vacation_adjustment_days = COALESCE($24, vacation_adjustment_days),
      payday_day = COALESCE($25, payday_day),
      owner_name = COALESCE($26, owner_name),
      updated_by_id = $27,
      updated_by_name = $28,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(29)}
     RETURNING ${WORKER_COLUMNS}`,
    [
      id,
      input.number?.trim() || null,
      input.fullName !== undefined ? input.fullName.trim() : null,
      input.taxId !== undefined ? input.taxId.trim() : null,
      input.email !== undefined ? input.email.trim() : null,
      input.phone !== undefined ? input.phone.trim() : null,
      input.address !== undefined ? input.address.trim() : null,
      input.avatarUrl !== undefined ? input.avatarUrl.trim() || null : existing.avatar_url,
      input.jobTitle !== undefined ? input.jobTitle.trim() : null,
      input.businessUnit !== undefined ? input.businessUnit.trim() : null,
      input.jobFunctions !== undefined ? input.jobFunctions.trim() || null : existing.job_functions,
      input.status ?? null,
      input.contractType ?? null,
      input.workHours ?? null,
      input.startDate !== undefined ? parseDateInput(input.startDate) : null,
      input.endDate !== undefined
        ? input.endDate
          ? parseDateInput(input.endDate)
          : null
        : existing.end_date,
      baseSalaryCents ?? null,
      gratificationCents ?? null,
      input.afpName !== undefined ? input.afpName.trim() : null,
      input.afpRate ?? null,
      input.healthInstitution !== undefined ? input.healthInstitution.trim() : null,
      input.healthPlan !== undefined ? input.healthPlan.trim() : null,
      input.afcRate ?? null,
      input.vacationAdjustmentDays ?? null,
      input.paydayDay ?? null,
      input.ownerName !== undefined ? input.ownerName.trim() || actor.userName : null,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )

  const row = result.rows[0]
  if (!row) throw notFound('Trabajador no encontrado')
  const detail = await getWorkerById(row.id)

  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'el trabajador',
      recordTitle: detail.fullName || detail.number || detail.id,
      href: `/trabajadores/${detail.id}`,
      entityType: 'trabajador',
      entityId: detail.id,
    })
  }
  return detail
}

export async function archiveWorker(
  id: string,
  actor: AuditActor,
): Promise<WorkerListItem> {
  const result = await tenantQuery<WorkerRow>(
    `UPDATE crm_workers
     SET archived_at = now(), archived_by_id = $2,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${WORKER_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Trabajador no encontrado o ya archivado')
  return mapWorkerRow(row)
}

export async function restoreWorker(
  id: string,
  actor: AuditActor,
): Promise<WorkerListItem> {
  const result = await tenantQuery<WorkerRow>(
    `UPDATE crm_workers
     SET archived_at = NULL, archived_by_id = NULL,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${WORKER_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Trabajador no encontrado')
  return mapWorkerRow(row)
}

export async function permanentlyDeleteWorker(
  id: string,
  actor: AuditActor,
): Promise<void> {
  await withTenantClient(async (client) => {
    const result = await client.query(
      `UPDATE crm_workers
       SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
      [id, actor.userId, actor.userName, getTenantIdOrDefault()],
    )
    if (result.rowCount === 0) throw notFound('Trabajador no encontrado')
    await purgeEntityNotesAndFiles('trabajador', id, client)
  })
}

// ── Vacaciones ────────────────────────────────────────────────────────────────
export async function listVacations(workerId: string): Promise<WorkerVacationRequest[]> {
  const result = await tenantQuery<WorkerVacationRow>(
    `SELECT ${VACATION_COLUMNS}
     FROM crm_worker_vacation_requests
     WHERE worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}
     ORDER BY start_date DESC`,
    [workerId, getTenantIdOrDefault()],
  )
  return result.rows.map(mapVacationRow)
}

export async function createVacation(
  workerId: string,
  input: CreateVacationInput,
  actor: AuditActor,
): Promise<WorkerVacationRequest> {
  await loadWorkerRow(workerId)
  const startIso = parseDateInput(input.startDate)
  const endIso = parseDateInput(input.endDate)
  if (!startIso || !endIso) throw badRequest('Indica fechas de inicio y término válidas')
  if (endIso < startIso) throw badRequest('La fecha de término no puede ser anterior al inicio')

  const days = input.days != null && input.days > 0
    ? input.days
    : daysBetweenInclusive(startIso, endIso)

  const result = await tenantQuery<WorkerVacationRow>(
    `INSERT INTO crm_worker_vacation_requests (
      worker_id, start_date, end_date, days, status, notes,
      created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, $9)
    RETURNING ${VACATION_COLUMNS}`,
    [
      workerId,
      startIso,
      endIso,
      days,
      input.status ?? 'Pendiente',
      input.notes?.trim() || null,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  return mapVacationRow(result.rows[0]!)
}

export async function updateVacation(
  workerId: string,
  vacationId: string,
  input: UpdateVacationInput,
  actor: AuditActor,
): Promise<WorkerVacationRequest> {
  const result = await tenantQuery<WorkerVacationRow>(
    `UPDATE crm_worker_vacation_requests SET
      status = COALESCE($3, status),
      notes = COALESCE($4, notes),
      updated_by_id = $5, updated_by_name = $6, updated_at = now()
     WHERE id = $2 AND worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(7)}
     RETURNING ${VACATION_COLUMNS}`,
    [
      workerId,
      vacationId,
      input.status ?? null,
      input.notes !== undefined ? input.notes.trim() || null : null,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Solicitud de vacaciones no encontrada')
  return mapVacationRow(row)
}

export async function deleteVacation(
  workerId: string,
  vacationId: string,
  actor: AuditActor,
): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_worker_vacation_requests
     SET deleted_at = now(), updated_by_id = $3, updated_by_name = $4, updated_at = now()
     WHERE id = $2 AND worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(5)}`,
    [workerId, vacationId, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Solicitud de vacaciones no encontrada')
}

// ── Liquidaciones ─────────────────────────────────────────────────────────────
export async function listPayrolls(workerId: string): Promise<WorkerPayrollListItem[]> {
  const result = await tenantQuery<WorkerPayrollRow>(
    `SELECT ${PAYROLL_COLUMNS}
     FROM crm_worker_payrolls
     WHERE worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}
     ORDER BY period_year DESC, period_month DESC`,
    [workerId, getTenantIdOrDefault()],
  )
  return result.rows.map(mapPayrollRow)
}

export async function getPayrollById(
  workerId: string,
  payrollId: string,
): Promise<WorkerPayrollListItem> {
  const result = await tenantQuery<WorkerPayrollRow>(
    `SELECT ${PAYROLL_COLUMNS}
     FROM crm_worker_payrolls
     WHERE id = $2 AND worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(3)}`,
    [workerId, payrollId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Liquidación no encontrada')
  return mapPayrollRow(row)
}

export async function createPayroll(
  workerId: string,
  input: CreatePayrollInput,
  actor: AuditActor,
): Promise<WorkerPayrollListItem> {
  const worker = mapWorkerRow(await loadWorkerRow(workerId))
  const now = new Date()
  const periodYear = input.periodYear ?? now.getFullYear()
  const periodMonth = input.periodMonth ?? now.getMonth() + 1

  const calc = computePayroll(worker, input)
  const snapshot = {
    number: worker.number,
    fullName: worker.fullName,
    taxId: worker.taxId,
    jobTitle: worker.jobTitle,
    businessUnit: worker.businessUnit,
    contractType: worker.contractType,
  }

  const result = await tenantQuery<WorkerPayrollRow>(
    `INSERT INTO crm_worker_payrolls (
      worker_id, period_year, period_month, days_worked, days_license,
      days_absence, days_vacation, uf_value_cents, earnings_json, deductions_json,
      taxable_base_cents, tax_base_cents, gross_cents, net_cents, overdraft_cents,
      paid_at, worker_snapshot_json,
      created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9::jsonb, $10::jsonb,
      $11, $12, $13, $14, $15,
      $16, $17::jsonb,
      $18, $19, $18, $19, $20
    )
    RETURNING ${PAYROLL_COLUMNS}`,
    [
      workerId,
      periodYear,
      periodMonth,
      calc.daysWorked,
      calc.daysLicense,
      calc.daysAbsence,
      calc.daysVacation,
      input.ufValueCents ?? 0,
      JSON.stringify(calc.earnings),
      JSON.stringify(calc.deductions),
      calc.taxableBaseCents,
      calc.taxBaseCents,
      calc.grossCents,
      calc.netCents,
      calc.overdraftCents,
      input.paid ? now.toISOString() : null,
      JSON.stringify(snapshot),
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  return mapPayrollRow(result.rows[0]!)
}

export async function markPayrollPaid(
  workerId: string,
  payrollId: string,
  paid: boolean,
  actor: AuditActor,
): Promise<WorkerPayrollListItem> {
  const result = await tenantQuery<WorkerPayrollRow>(
    `UPDATE crm_worker_payrolls SET
      paid_at = $3,
      updated_by_id = $4, updated_by_name = $5, updated_at = now()
     WHERE id = $2 AND worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(6)}
     RETURNING ${PAYROLL_COLUMNS}`,
    [
      workerId,
      payrollId,
      paid ? new Date().toISOString() : null,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Liquidación no encontrada')
  return mapPayrollRow(row)
}

export async function deletePayroll(
  workerId: string,
  payrollId: string,
  actor: AuditActor,
): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_worker_payrolls
     SET deleted_at = now(), updated_by_id = $3, updated_by_name = $4, updated_at = now()
     WHERE id = $2 AND worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(5)}`,
    [workerId, payrollId, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Liquidación no encontrada')
}

/** Snapshot del trabajador guardado en la liquidación (para el PDF). */
export async function getPayrollSnapshot(
  workerId: string,
  payrollId: string,
): Promise<{
  number?: string
  fullName?: string
  taxId?: string
  jobTitle?: string
  businessUnit?: string
  contractType?: string
}> {
  const result = await tenantQuery<{ worker_snapshot_json: unknown }>(
    `SELECT worker_snapshot_json
     FROM crm_worker_payrolls
     WHERE id = $2 AND worker_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(3)}`,
    [workerId, payrollId, getTenantIdOrDefault()],
  )
  const raw = result.rows[0]?.worker_snapshot_json
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw as Record<string, string>
}
