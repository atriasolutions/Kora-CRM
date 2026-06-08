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
import { createCompany } from '../repositories/companies.repository.js'
import { createContact } from '../repositories/contacts.repository.js'
import { env } from '../config/env.js'
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
}): Promise<void> {
  try {
    await notifyByUserId(params.owner.userId, {
      type: 'assignment',
      title: 'Nuevo lead desde la web',
      message: `Nuevo contacto desde prueba gratis: ${params.recordTitle}`,
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

/** Crea (o reutiliza) empresa prospecto + contacto en tenant Atria Solutions. */
export async function createAtriaProspectFromTrialLead(
  input: TrialLeadInput,
): Promise<{ companyId: string; contactId: string; createdCompany: boolean; createdContact: boolean }> {
  await assertValidRegionCommune(input.region, input.commune)
  const owner = await resolveMarketingLeadOwner()
  const leadSource = env.marketingLeadSource

  return runWithTenantAsync({ tenantId: ATRIA_TENANT_ID, tenantSlug: 'atriasolutions' }, async () => {
    const actor = marketingActor(owner)

    let companyId = await findAtriaCompanyIdByRut(input.rut)
    let createdCompany = false

    if (!companyId) {
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
      createdCompany = true

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
    } else {
      await assignRecordOwner('crm_companies', companyId, owner)
    }

    const existingContactId = await findAtriaContactIdByEmail(input.email)
    if (existingContactId) {
      await assignRecordOwner('crm_contacts', existingContactId, owner)
      await notifyMarketingLeadAssignment({
        owner,
        recordTitle: input.name.trim(),
        href: `/contactos/${existingContactId}`,
        entityType: 'contacto',
        entityId: existingContactId,
      })
      return {
        companyId,
        contactId: existingContactId,
        createdCompany,
        createdContact: false,
      }
    }

    const noteParts = [
      input.message?.trim(),
      `Canal: ${leadSource} (koracrm.cl/prueba-gratis)`,
    ].filter(Boolean)

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
    await notifyMarketingLeadAssignment({
      owner,
      recordTitle: contact.name,
      href: `/contactos/${contact.id}`,
      entityType: 'contacto',
      entityId: contact.id,
    })

    return {
      companyId,
      contactId: contact.id,
      createdCompany,
      createdContact: true,
    }
  })
}
