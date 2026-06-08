import { platformQuery, tenantQuery } from '../db/tenant-query.js'
import {
  inferStoredTaxIdKind,
  normalizeStoredTaxIdKey,
  SQL_NORMALIZED_DNI,
  SQL_NORMALIZED_RUT,
} from '../lib/tax-id.js'
import { getTenantIdOrDefault, runWithTenantAsync } from '../lib/tenant-context.js'
import { assertValidRegionCommune } from '../lib/validate-geo-fields.js'
import { upsertCompanyHeadquarters } from '../repositories/company-locations.repository.js'
import {
  createCompany,
  findActiveCompanyIdByName,
} from '../repositories/companies.repository.js'
import { createContact } from '../repositories/contacts.repository.js'
import { createOpportunity } from '../repositories/opportunities.repository.js'
import { env } from '../config/env.js'
import { AppError } from '../middleware/errors.js'
import { notifyByUserId } from '../services/notifications.service.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import type { AuditActor } from '../types/audit.js'
import type { TrialLeadInput } from '../validators/marketing.validator.js'

type LeadOwner = { userId: string; userName: string }

/** Solo usuarios plenamente activos en el tenant pueden recibir leads automáticos. */
const ACTIVE_LEAD_MEMBERSHIP_STATUSES = ['active'] as const

function marketingActor(owner: LeadOwner): AuditActor {
  return {
    userId: owner.userId,
    userName: owner.userName,
    tenantId: ATRIA_TENANT_ID,
  }
}

function isConflictError(err: unknown): boolean {
  return err instanceof AppError && err.statusCode === 409
}

async function lookupActiveMarketingLeadOwner(
  sql: string,
  params: unknown[],
): Promise<LeadOwner | null> {
  const result = await platformQuery<{ id: string; name: string }>(sql, params)
  const row = result.rows[0]
  return row ? { userId: row.id, userName: row.name } : null
}

async function resolveDemoLeadOwner(): Promise<LeadOwner> {
  const byId = await platformQuery<{ id: string; name: string }>(
    `SELECT id, name FROM crm_users WHERE deleted_at IS NULL AND id = $1::uuid LIMIT 1`,
    [env.demoUserId],
  )
  const row = byId.rows[0]
  if (row) return { userId: row.id, userName: row.name }
  return { userId: env.demoUserId, userName: env.demoUserName }
}

async function resolveMarketingLeadOwner(): Promise<LeadOwner> {
  const tenantId = ATRIA_TENANT_ID
  const membershipStatuses = ACTIVE_LEAD_MEMBERSHIP_STATUSES
  const activeUserClause = `u.deleted_at IS NULL AND u.status = 'Activo'`

  if (env.marketingLeadOwnerUserId) {
    const owner = await lookupActiveMarketingLeadOwner(
      `SELECT u.id, u.name
       FROM crm_users u
       INNER JOIN crm_tenant_memberships m
         ON m.user_id = u.id AND m.tenant_id = $1 AND m.status = ANY($2::crm_membership_status[])
       WHERE ${activeUserClause} AND u.id = $3::uuid
       LIMIT 1`,
      [tenantId, membershipStatuses, env.marketingLeadOwnerUserId],
    )
    if (owner) return owner
  }

  const email = env.marketingLeadOwnerEmail
  if (email) {
    const owner = await lookupActiveMarketingLeadOwner(
      `SELECT u.id, u.name
       FROM crm_users u
       INNER JOIN crm_tenant_memberships m
         ON m.user_id = u.id AND m.tenant_id = $1 AND m.status = ANY($2::crm_membership_status[])
       WHERE ${activeUserClause} AND lower(trim(u.email)) = lower($3)
       LIMIT 1`,
      [tenantId, membershipStatuses, email],
    )
    if (owner) return owner
  }

  const configuredName = env.marketingLeadOwnerName
  const owner = await lookupActiveMarketingLeadOwner(
    `SELECT u.id, u.name
     FROM crm_users u
     INNER JOIN crm_tenant_memberships m
       ON m.user_id = u.id AND m.tenant_id = $1 AND m.status = ANY($2::crm_membership_status[])
     WHERE ${activeUserClause} AND lower(trim(u.name)) = lower($3)
     LIMIT 1`,
    [tenantId, membershipStatuses, configuredName],
  )
  if (owner) return owner

  return resolveDemoLeadOwner()
}

async function assignRecordOwner(
  table: 'crm_companies' | 'crm_contacts',
  recordId: string,
  owner: LeadOwner,
): Promise<void> {
  await tenantQuery(
    `UPDATE ${table}
     SET owner_name = $1, owner_user_id = $2, updated_at = now()
     WHERE id = $3 AND deleted_at IS NULL AND tenant_id = $4`,
    [owner.userName, owner.userId, recordId, getTenantIdOrDefault()],
  )
}

async function notifyMarketingLeadAssignment(params: {
  owner: LeadOwner
  recordTitle: string
  href: string
  entityType: string
  entityId: string
  title?: string
  message?: string
}): Promise<void> {
  try {
    await notifyByUserId(params.owner.userId, {
      type: 'assignment',
      title: params.title ?? 'Nuevo lead desde la web',
      message:
        params.message ??
        `Nuevo contacto desde prueba gratis: ${params.recordTitle}`,
      href: params.href,
      entityType: params.entityType,
      entityId: params.entityId,
    })
  } catch (err) {
    console.error('[marketing-lead] Error al notificar responsable:', err)
  }
}

async function findAtriaCompanyIdByRut(rut: string): Promise<string | null> {
  const kind = inferStoredTaxIdKind(rut)
  const key = normalizeStoredTaxIdKey(rut, kind)
  if (!key) return null
  const normalizedExpr = kind === 'rut' ? SQL_NORMALIZED_RUT : SQL_NORMALIZED_DNI
  const result = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_companies
     WHERE deleted_at IS NULL
       AND tenant_id = $1
       AND rut IS NOT NULL
       AND trim(rut) <> ''
       AND ${normalizedExpr} = $2
     LIMIT 1`,
    [ATRIA_TENANT_ID, key],
  )
  return result.rows[0]?.id ?? null
}

async function findAtriaContactIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const result = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_contacts
     WHERE deleted_at IS NULL
       AND tenant_id = $1
       AND email IS NOT NULL
       AND lower(trim(email)) = $2
     LIMIT 1`,
    [ATRIA_TENANT_ID, normalized],
  )
  return result.rows[0]?.id ?? null
}

async function resolveAtriaCompany(
  input: TrialLeadInput,
  owner: LeadOwner,
  actor: AuditActor,
): Promise<{ companyId: string; created: boolean }> {
  let companyId =
    (await findAtriaCompanyIdByRut(input.rut)) ??
    (await findActiveCompanyIdByName(input.company))

  if (companyId) {
    await assignRecordOwner('crm_companies', companyId, owner)
    return { companyId, created: false }
  }

  try {
    const company = await createCompany(
      {
        name: input.company.trim(),
        rut: input.rut.trim(),
        employees: input.employees.trim(),
        headquartersStreet: input.address.trim(),
        city: input.commune.trim(),
        lifecycle: 'Prospecto',
        operationalStatus: 'Activa',
        industry: '',
        ownerName: owner.userName,
      },
      actor,
    )
    companyId = company.id

    await upsertCompanyHeadquarters(companyId, {
      label: 'Casa matriz',
      street: input.address.trim(),
      city: input.commune.trim(),
      commune: input.commune.trim(),
      region: input.region.trim(),
      country: 'Chile',
      lat: -33.4489,
      lng: -70.6693,
    })

    await assignRecordOwner('crm_companies', companyId, owner)
    return { companyId, created: true }
  } catch (err) {
    if (isConflictError(err)) {
      companyId =
        (await findAtriaCompanyIdByRut(input.rut)) ??
        (await findActiveCompanyIdByName(input.company))
      if (companyId) {
        await assignRecordOwner('crm_companies', companyId, owner)
        return { companyId, created: false }
      }
    }
    throw err
  }
}

async function resolveAtriaContact(
  input: TrialLeadInput,
  companyId: string,
  owner: LeadOwner,
  actor: AuditActor,
  leadSource: string,
): Promise<{ contactId: string; created: boolean }> {
  let contactId = await findAtriaContactIdByEmail(input.email)
  if (contactId) {
    await assignRecordOwner('crm_contacts', contactId, owner)
    return { contactId, created: false }
  }

  const noteParts = [
    input.message?.trim(),
    `Canal: ${leadSource} (koracrm.cl/prueba-gratis)`,
  ].filter(Boolean)

  try {
    const contact = await createContact(
      {
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        companyId,
        region: input.region.trim(),
        commune: input.commune.trim(),
        streetAddress: input.address.trim(),
        status: 'Prospecto',
        source: leadSource,
        ownerName: owner.userName,
        initialNote: noteParts.join('\n\n'),
      },
      actor,
    )
    await assignRecordOwner('crm_contacts', contact.id, owner)
    return { contactId: contact.id, created: true }
  } catch (err) {
    if (isConflictError(err)) {
      contactId = await findAtriaContactIdByEmail(input.email)
      if (contactId) {
        await assignRecordOwner('crm_contacts', contactId, owner)
        return { contactId, created: false }
      }
    }
    throw err
  }
}

async function createLeadOpportunity(params: {
  input: TrialLeadInput
  owner: LeadOwner
  actor: AuditActor
  companyId: string
  contactId: string
  leadSource: string
}): Promise<{ opportunityId: string }> {
  const descriptionParts = [
    params.input.message?.trim(),
    `Empleados: ${params.input.employees.trim()}`,
    `Canal: ${params.leadSource} (koracrm.cl/prueba-gratis)`,
  ].filter(Boolean)

  const opportunity = await createOpportunity(
    {
      name: `Demo gratis · ${params.input.company.trim()}`,
      companyId: params.companyId,
      contactId: params.contactId,
      contactName: params.input.name.trim(),
      contactEmail: params.input.email.trim(),
      contactPhone: params.input.phone.trim(),
      owner: params.owner.userName,
      source: params.leadSource,
      stage: 'Calificados',
      type: 'Nuevo negocio',
      priority: 'Media',
      outcome: 'Abierta',
      forecast: 'En pipeline',
      description: descriptionParts.join('\n\n'),
    },
    params.actor,
  )

  await notifyMarketingLeadAssignment({
    owner: params.owner,
    recordTitle: opportunity.name,
    href: `/oportunidades/${opportunity.id}`,
    entityType: 'oportunidad',
    entityId: opportunity.id,
    title: 'Nueva oportunidad desde la web',
    message: `Solicitud de demo gratis: ${params.input.company.trim()}`,
  })

  return { opportunityId: opportunity.id }
}

export type AtriaProspectFromTrialLeadResult = {
  companyId: string
  contactId: string
  opportunityId: string
  createdCompany: boolean
  createdContact: boolean
  createdOpportunity: boolean
}

/** Crea (o reutiliza) empresa + contacto + oportunidad en tenant Atria Solutions. */
export async function createAtriaProspectFromTrialLead(
  input: TrialLeadInput,
): Promise<AtriaProspectFromTrialLeadResult> {
  await assertValidRegionCommune(input.region, input.commune)
  const owner = await resolveMarketingLeadOwner()
  const leadSource = env.marketingLeadSource

  return runWithTenantAsync({ tenantId: ATRIA_TENANT_ID, tenantSlug: 'atriasolutions' }, async () => {
    const actor = marketingActor(owner)

    const { companyId, created: createdCompany } = await resolveAtriaCompany(
      input,
      owner,
      actor,
    )
    const { contactId, created: createdContact } = await resolveAtriaContact(
      input,
      companyId,
      owner,
      actor,
      leadSource,
    )

    const { opportunityId } = await createLeadOpportunity({
      input,
      owner,
      actor,
      companyId,
      contactId,
      leadSource,
    })

    if (createdContact) {
      await notifyMarketingLeadAssignment({
        owner,
        recordTitle: input.name.trim(),
        href: `/contactos/${contactId}`,
        entityType: 'contacto',
        entityId: contactId,
      })
    }

    return {
      companyId,
      contactId,
      opportunityId,
      createdCompany,
      createdContact,
      createdOpportunity: true,
    }
  })
}
