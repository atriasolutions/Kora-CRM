import { pool } from '../db/pool.js'
import { mapCompanyDetail, mapCompanyRow, type CompanyRow } from '../mappers/company.mapper.js'
import { notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CompanyListItem,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../types/company.js'
import { paginationOffset } from '../utils/pagination.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import {
  assertUniqueCompanyTaxId,
} from '../lib/tax-id-uniqueness.js'
import { maybeNotifyRecordOwnerChange } from '../lib/owner-assignment.js'

const SELECT_COLUMNS = `
  id, name, logo_url, rut, headquarters_street, industry, city, employees,
  owner_name, lifecycle, operational_status, last_activity_at,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

export type ListCompaniesParams = {
  page: number
  pageSize: number
  q?: string
  lifecycle?: string
  includeDeleted?: boolean
  archivedOnly?: boolean
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
  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  if (params.lifecycle) {
    conditions.push(`lifecycle = $${idx++}`)
    values.push(params.lifecycle)
  }
  if (params.q) {
    conditions.push(
      `(name ILIKE $${idx} OR rut ILIKE $${idx} OR industry ILIKE $${idx} OR city ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_companies ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await pool.query<CompanyRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_companies
     ${where}
     ORDER BY name ASC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return {
    items: result.rows.map(mapCompanyRow),
    total,
  }
}

export async function getCompanyById(id: string): Promise<CompanyListItem> {
  const result = await pool.query<CompanyRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_companies
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada')
  return mapCompanyDetail(row)
}

/** Resuelve id+nombre aunque la empresa esté eliminada (conserva FK en contactos). */
export async function getCompanyLinkById(
  id: string,
): Promise<{ id: string; name: string } | null> {
  const result = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM crm_companies WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

/** Vincula por nombre solo si hay una empresa activa (no archivada/eliminada) con ese nombre. */
export async function findActiveCompanyIdByName(
  name: string,
): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM crm_companies
     WHERE deleted_at IS NULL AND archived_at IS NULL
       AND lower(trim(name)) = lower($1)
     LIMIT 2`,
    [trimmed],
  )
  if (result.rows.length !== 1) return null
  return result.rows[0]!.id
}

export async function createCompany(
  input: CreateCompanyInput,
  actor: AuditActor,
): Promise<CompanyListItem> {
  await assertUniqueCompanyTaxId(input.rut)

  const result = await pool.query<CompanyRow>(
    `INSERT INTO crm_companies (
      name, logo_url, rut, headquarters_street, industry, city, employees,
      owner_name, lifecycle, operational_status,
      created_by_id, created_by_name, updated_by_id, updated_by_name
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10,
      $11, $12, $11, $12
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
      input.lifecycle ?? 'Prospecto',
      input.operationalStatus ?? 'Activa',
      actor.userId,
      actor.userName,
    ],
  )
  return mapCompanyRow(result.rows[0]!)
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

  const result = await pool.query<CompanyRow>(
    `UPDATE crm_companies SET
      name = $2,
      logo_url = $3,
      rut = $4,
      headquarters_street = $5,
      industry = $6,
      city = $7,
      employees = $8,
      owner_name = $9,
      lifecycle = $10,
      operational_status = $11,
      updated_by_id = $12,
      updated_by_name = $13,
      updated_at = now()
    WHERE id = $1 AND deleted_at IS NULL
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
      input.lifecycle ?? existing.lifecycle,
      input.operationalStatus ?? existing.operationalStatus,
      actor.userId,
      actor.userName,
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
  const result = await pool.query(
    `UPDATE crm_companies
     SET deleted_at = now(), deleted_by_id = $2, updated_at = now(),
         updated_by_id = $2, updated_by_name = $3
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, actor.userId, actor.userName],
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
  const result = await pool.query<CompanyRow>(
    `UPDATE crm_companies
     SET archived_at = now(), archived_by_id = $2,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL
     RETURNING ${SELECT_COLUMNS}`,
    [id, actor.userId, actor.userName],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada o ya archivada')
  return mapCompanyRow(row)
}

export async function restoreCompany(
  id: string,
  actor: AuditActor,
): Promise<CompanyListItem> {
  const result = await pool.query<CompanyRow>(
    `UPDATE crm_companies
     SET archived_at = NULL, archived_by_id = NULL,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${SELECT_COLUMNS}`,
    [id, actor.userId, actor.userName],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Empresa no encontrada')
  return mapCompanyRow(row)
}
