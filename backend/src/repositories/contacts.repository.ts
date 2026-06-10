import { tenantQuery } from '../db/tenant-query.js'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import {
  findActiveCompanyIdByName,
  getCompanyById,
  getCompanyLinkById,
} from './companies.repository.js'
import {
  mapContactDetail,
  mapContactRow,
  type ContactRow,
} from '../mappers/contact.mapper.js'
import { assertValidRegionCommune } from '../lib/validate-geo-fields.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  ContactDetail,
  ContactListItem,
  CreateContactInput,
  UpdateContactInput,
} from '../types/contact.js'
import { paginationOffset } from '../utils/pagination.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import { assertUniqueContactEmail } from '../lib/contact-uniqueness.js'
import { assertUniqueContactRut } from '../lib/tax-id-uniqueness.js'
import { maybeNotifyRecordOwnerChange } from '../lib/owner-assignment.js'

const SELECT_COLUMNS = `
  id, name, subtitle, avatar_url, company_id, company_name,
  email, phone, mobile_phone, job_title, status, rut,
  street_address, region, commune, linked_in, source, initial_note,
  owner_name, last_contact_at,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

async function resolveCompanySnapshot(
  companyId: string | null | undefined,
  companyNameFallback: string | undefined,
): Promise<{ companyId: string | null; companyName: string }> {
  if (companyId) {
    const link = await getCompanyLinkById(companyId)
    if (link) {
      return { companyId: link.id, companyName: link.name }
    }
  }
  if (companyNameFallback?.trim()) {
    const name = companyNameFallback.trim()
    const matchedId = await findActiveCompanyIdByName(name)
    return {
      companyId: matchedId,
      companyName: name,
    }
  }
  return { companyId: null, companyName: '' }
}

export type ListContactsParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  companyId?: string
  includeDeleted?: boolean
  /** Si true, solo registros en papelera (archived_at IS NOT NULL). */
  archivedOnly?: boolean
}

export async function listContacts(
  params: ListContactsParams,
): Promise<{ items: ContactListItem[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (!params.includeDeleted) conditions.push('deleted_at IS NULL')
  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
  if (params.status) {
    conditions.push(`status = $${idx++}`)
    values.push(params.status)
  }
  if (params.companyId) {
    conditions.push(
      `(company_id = $${idx} OR (
        company_id IS NULL AND company_name <> ''
        AND company_name = (SELECT name FROM crm_companies WHERE id = $${idx})
      ))`,
    )
    values.push(params.companyId)
    idx++
  }
  if (params.q) {
    conditions.push(
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR company_name ILIKE $${idx} OR phone ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_contacts ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await tenantQuery<ContactRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_contacts
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return { items: result.rows.map(mapContactRow), total }
}

export async function getContactById(id: string): Promise<ContactDetail> {
  const result = await tenantQuery<ContactRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_contacts
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Contacto no encontrado')
  return mapContactDetail(row)
}

export async function getContactAvatarStored(id: string): Promise<string | null> {
  const result = await tenantQuery<{ avatar_url: string | null }>(
    `SELECT avatar_url FROM crm_contacts
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  return result.rows[0]?.avatar_url?.trim() ?? null
}

export async function createContact(
  input: CreateContactInput,
  actor: AuditActor,
): Promise<ContactDetail> {
  await enforceRecordQuota(actor)
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')

  if (input.companyId) {
    await getCompanyById(input.companyId)
  }

  await assertValidRegionCommune(input.region, input.commune)

  await assertUniqueContactRut(input.rut)
  await assertUniqueContactEmail(input.email)

  const { companyId, companyName } = await resolveCompanySnapshot(
    input.companyId,
    input.company,
  )

  const result = await tenantQuery<ContactRow>(
    `INSERT INTO crm_contacts (
      name, subtitle, avatar_url, company_id, company_name,
      email, phone, mobile_phone, job_title, status, rut,
      street_address, region, commune, linked_in, source, initial_note,
      owner_name,
      created_by_id, created_by_name, updated_by_id, updated_by_name,
      tenant_id
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17,
      $18,
      $19, $20, $19, $20,
      $21
    )
    RETURNING ${SELECT_COLUMNS}`,
    [
      input.name.trim(),
      input.subtitle?.trim() || null,
      input.avatarUrl?.trim() || null,
      companyId,
      companyName,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.mobilePhone?.trim() || null,
      input.role?.trim() || null,
      input.status ?? 'Prospecto',
      input.rut?.trim() || null,
      input.streetAddress?.trim() || null,
      input.region?.trim() || null,
      input.commune?.trim() || null,
      input.linkedIn?.trim() || null,
      input.source?.trim() || null,
      input.initialNote?.trim() || null,
      input.ownerName?.trim() || actor.userName,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  return mapContactDetail(result.rows[0]!)
}

export async function updateContact(
  id: string,
  input: UpdateContactInput,
  actor: AuditActor,
): Promise<ContactDetail> {
  const existing = await getContactById(id)
  const previousOwner = existing.ownerName ?? ''

  let companyId = existing.companyId ?? null
  let companyName = existing.company

  if (input.companyId !== undefined || input.company !== undefined) {
    const resolved = await resolveCompanySnapshot(
      input.companyId ?? companyId,
      input.company ?? companyName,
    )
    companyId = resolved.companyId
    companyName = resolved.companyName
  }

  const nextRegion =
    input.region !== undefined ? input.region : (existing.region ?? undefined)
  const nextCommune =
    input.commune !== undefined ? input.commune : (existing.commune ?? undefined)
  if (input.region !== undefined || input.commune !== undefined) {
    await assertValidRegionCommune(nextRegion, nextCommune)
  }

  const nextRut = input.rut !== undefined ? input.rut : existing.rut
  const nextEmail = input.email !== undefined ? input.email : existing.email
  await assertUniqueContactRut(nextRut, id)
  await assertUniqueContactEmail(nextEmail, id)

  const result = await tenantQuery<ContactRow>(
    `UPDATE crm_contacts SET
      name = $2,
      subtitle = $3,
      avatar_url = $4,
      company_id = $5,
      company_name = $6,
      email = $7,
      phone = $8,
      mobile_phone = $9,
      job_title = $10,
      status = $11,
      rut = $12,
      street_address = $13,
      region = $14,
      commune = $15,
      linked_in = $16,
      source = $17,
      initial_note = $18,
      owner_name = $19,
      updated_by_id = $20,
      updated_by_name = $21,
      updated_at = now()
    WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(22)}
    RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      input.name?.trim() ?? existing.name,
      input.subtitle?.trim() ?? existing.subtitle,
      input.avatarUrl?.trim() ?? (existing.avatarUrl || null),
      companyId,
      companyName,
      input.email?.trim() ?? existing.email,
      input.phone?.trim() ?? existing.phone,
      input.mobilePhone?.trim() ?? existing.mobilePhone ?? null,
      input.role?.trim() ?? existing.role,
      input.status ?? existing.status,
      input.rut?.trim() ?? existing.rut ?? null,
      input.streetAddress?.trim() ?? existing.streetAddress ?? null,
      input.region?.trim() ?? existing.region ?? null,
      input.commune?.trim() ?? existing.commune ?? null,
      input.linkedIn?.trim() ?? existing.linkedIn ?? null,
      input.source?.trim() ?? existing.source ?? null,
      input.initialNote?.trim() ?? existing.initialNote ?? null,
      input.ownerName?.trim() ?? existing.ownerName ?? actor.userName,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Contacto no encontrado')
  const detail = mapContactDetail(row)
  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.ownerName ?? '',
      moduleLabel: 'el contacto',
      recordTitle: detail.name,
      href: `/contactos/${detail.id}`,
      entityType: 'contacto',
      entityId: detail.id,
    })
  }
  return detail
}

export async function softDeleteContact(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_contacts
     SET deleted_at = now(), deleted_by_id = $2,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Contacto no encontrado')
  await purgeEntityNotesAndFiles('contacto', id)
}

export async function archiveContact(
  id: string,
  actor: AuditActor,
): Promise<ContactDetail> {
  const result = await tenantQuery<ContactRow>(
    `UPDATE crm_contacts
     SET archived_at = now(), archived_by_id = $2,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${SELECT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Contacto no encontrado o ya archivado')
  return mapContactDetail(row)
}

export async function restoreContact(
  id: string,
  actor: AuditActor,
): Promise<ContactDetail> {
  const result = await tenantQuery<ContactRow>(
    `UPDATE crm_contacts
     SET archived_at = NULL, archived_by_id = NULL,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${SELECT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Contacto no encontrado')
  return mapContactDetail(row)
}
