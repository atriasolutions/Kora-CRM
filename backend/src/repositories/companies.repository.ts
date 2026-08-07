import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { mapCompanyDetail, mapCompanyRow, type CompanyRow } from '../mappers/company.mapper.js'
import { notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CompanyListItem,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../types/company.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import {
  assertUniqueCompanyTaxId,
} from '../lib/tax-id-uniqueness.js'
import { maybeNotifyRecordOwnerChange, maybeNotifyRecordOwnerOnCreate } from '../lib/owner-assignment.js'

const SELECT_COLUMNS = `
  id, name, logo_url, rut, headquarters_street, industry, city, employees,
  owner_name, website, email, phone, description,
  lifecycle, operational_status, last_activity_at,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`


const COMPANY_SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  industry: 'industry',
  city: 'city',
  lifecycle: 'lifecycle',
  owner: 'owner_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export type ListCompaniesParams = {
  page: number
  pageSize: number
  q?: string
  lifecycle?: string
  includeDeleted?: boolean
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

export async function listCompanies(
  params: ListCompaniesParams,
): Promise<{ items: CompanyListItem[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (!params.includeDeleted) {
    conditions.push('deleted_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  if (params.lifecycle?.trim()) {
    const lifecycles = parseCommaSeparatedList(params.lifecycle)
    if (lifecycles.length === 1) {
      conditions.push(`lifecycle = $${idx++}`)
      values.push(lifecycles[0])
    } else if (lifecycles.length > 1) {
      conditions.push(`lifecycle = ANY($${idx++}::text[])`)
      values.push(lifecycles)
    }
  }
  if (params.q) {
    conditions.push(
      `(name ILIKE $${idx} OR rut ILIKE $${idx} OR industry ILIKE $${idx} OR city ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'created_at',
    params.dateFrom,
    params.dateTo,
  )

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    COMPANY_SORT_COLUMNS,
    'name ASC',
  )

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_companies ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<CompanyRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM crm_companies
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return {
      items: result.rows.map(mapCompanyRow),
      total,
    }
  })
}

export async function getCompanyById(id: string): Promise<CompanyListItem> {
  const result = await tenantQuery<CompanyRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_companies
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada')
  return mapCompanyDetail(row)
}

export async function getCompanyLogoStored(id: string): Promise<string | null> {
  const result = await tenantQuery<{ logo_url: string | null }>(
    `SELECT logo_url FROM crm_companies
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  return result.rows[0]?.logo_url?.trim() ?? null
}

/** Resuelve id+nombre aunque la empresa esté eliminada (conserva FK en contactos). */
export async function getCompanyLinkById(
  id: string,
): Promise<{ id: string; name: string } | null> {
  const result = await tenantQuery<{ id: string; name: string }>(
    `SELECT id, name FROM crm_companies WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  return result.rows[0] ?? null
}

/** Vincula por nombre solo si hay una empresa activa (no archivada/eliminada) con ese nombre. */
export async function findActiveCompanyIdByName(
  name: string,
): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const result = await tenantQuery<{ id: string }>(
    `SELECT id FROM crm_companies
     WHERE deleted_at IS NULL AND archived_at IS NULL
       AND lower(trim(name)) = lower($1)
       AND ${tenantWhereParam(2)}
     LIMIT 2`,
    [trimmed, getTenantIdOrDefault()],
  )
  if (result.rows.length !== 1) return null
  return result.rows[0]!.id
}

export async function createCompany(
  input: CreateCompanyInput,
  actor: AuditActor,
): Promise<CompanyListItem> {
  await enforceRecordQuota(actor)
  await assertUniqueCompanyTaxId(input.rut)

  const result = await tenantQuery<CompanyRow>(
    `INSERT INTO crm_companies (
      name, logo_url, rut, headquarters_street, industry, city, employees,
      owner_name, website, email, phone, description,
      lifecycle, operational_status,
      created_by_id, created_by_name, updated_by_id, updated_by_name,
      tenant_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14,
      $15, $16, $15, $16,
      $17
    )
    RETURNING ${SELECT_COLUMNS}`,
    [
      input.name.trim(),
      input.logoUrl?.trim() || null,
      input.rut?.trim() || null,
      input.headquartersStreet?.trim() || null,
      input.industry?.trim() || '',
      input.city?.trim() || '',
      input.employees?.trim() || '',
      input.ownerName?.trim() || actor.userName,
      input.website?.trim() ?? '',
      input.email?.trim() ?? '',
      input.phone?.trim() ?? '',
      input.description?.trim() ?? '',
      input.lifecycle ?? 'Prospecto',
      input.operationalStatus ?? 'Activa',
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const detail = mapCompanyRow(result.rows[0]!)
  maybeNotifyRecordOwnerOnCreate({
    actor,
    nextOwner: detail.owner ?? '',
    moduleLabel: 'la empresa',
    recordTitle: detail.name,
    href: `/empresas/${detail.id}`,
    entityType: 'empresa',
    entityId: detail.id,
  })
  return detail
}

export async function updateCompany(
  id: string,
  input: UpdateCompanyInput,
  actor: AuditActor,
): Promise<CompanyListItem> {
  const existing = await getCompanyById(id)
  const previousOwner = existing.owner ?? ''

  const nextRut = input.rut !== undefined ? input.rut : existing.rut
  await assertUniqueCompanyTaxId(nextRut, id)

  const result = await tenantQuery<CompanyRow>(
    `UPDATE crm_companies SET
      name = $2,
      logo_url = $3,
      rut = $4,
      headquarters_street = $5,
      industry = $6,
      city = $7,
      employees = $8,
      owner_name = $9,
      website = $10,
      email = $11,
      phone = $12,
      description = $13,
      lifecycle = $14,
      operational_status = $15,
      updated_by_id = $16,
      updated_by_name = $17,
      updated_at = now()
    WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(18)}
    RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      input.name?.trim() ?? existing.name,
      input.logoUrl?.trim() ?? (existing.logoUrl || null),
      input.rut?.trim() ?? existing.rut,
      input.headquartersStreet?.trim() ?? existing.headquartersStreet ?? null,
      input.industry?.trim() ?? existing.industry,
      input.city?.trim() ?? existing.city,
      input.employees?.trim() ?? existing.employees,
      input.ownerName?.trim() ?? existing.owner,
      input.website?.trim() ?? existing.website,
      input.email?.trim() ?? existing.email,
      input.phone?.trim() ?? existing.phone,
      input.description?.trim() ?? existing.description,
      input.lifecycle ?? existing.lifecycle,
      input.operationalStatus ?? existing.operationalStatus,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada')
  const detail = mapCompanyRow(row)
  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'la empresa',
      recordTitle: detail.name,
      href: `/empresas/${detail.id}`,
      entityType: 'empresa',
      entityId: detail.id,
    })
  }
  return detail
}

/** Soft delete: marca deleted_at; contactos conservan company_id + company_name (§2.6). */
export async function softDeleteCompany(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_companies
     SET deleted_at = now(), deleted_by_id = $2, updated_at = now(),
         updated_by_id = $2, updated_by_name = $3
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) {
    throw notFound('Empresa no encontrada')
  }
  await purgeEntityNotesAndFiles('empresa', id)
}

export async function archiveCompany(
  id: string,
  actor: AuditActor,
): Promise<CompanyListItem> {
  const result = await tenantQuery<CompanyRow>(
    `UPDATE crm_companies
     SET archived_at = now(), archived_by_id = $2,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${SELECT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada o ya archivada')
  return mapCompanyRow(row)
}

export async function restoreCompany(
  id: string,
  actor: AuditActor,
): Promise<CompanyListItem> {
  const result = await tenantQuery<CompanyRow>(
    `UPDATE crm_companies
     SET archived_at = NULL, archived_by_id = NULL,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${SELECT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada')
  return mapCompanyRow(row)
}

export async function getCompanyMonthlyAssignedHours(
  companyId: string,
): Promise<number | null> {
  const result = await tenantQuery<{ monthly_assigned_hours: string | null }>(
    `SELECT monthly_assigned_hours::text
     FROM crm_companies
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [companyId, getTenantIdOrDefault()],
  )
  const raw = result.rows[0]?.monthly_assigned_hours
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export async function updateCompanyMonthlyAssignedHours(
  companyId: string,
  monthlyAssignedHours: number | null,
  actor: AuditActor,
): Promise<number | null> {
  const result = await tenantQuery<{ monthly_assigned_hours: string | null }>(
    `UPDATE crm_companies SET
      monthly_assigned_hours = $2,
      updated_by_id = $3,
      updated_by_name = $4,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(5)}
     RETURNING monthly_assigned_hours::text`,
    [
      companyId,
      monthlyAssignedHours,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada')
  const raw = row.monthly_assigned_hours
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}
