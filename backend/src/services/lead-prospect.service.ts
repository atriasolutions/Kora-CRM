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
import { AppError } from '../middleware/errors.js'
import { notifyByUserId } from '../services/notifications.service.js'
import type { LeadOwner } from '../services/lead-owner.service.js'
import type { AuditActor } from '../types/audit.js'

export type LeadProspectInput = {
  name: string
  company: string
  rut: string
  employees: string
  address: string
  region: string
  commune: string
  email: string
  phone: string
  message?: string
}

export type CreateLeadProspectOptions = {
  tenantId: string
  tenantSlug: string
  owner: LeadOwner
  leadSource: string
  opportunityTitlePrefix?: string
  channelLabel?: string
}

export type LeadProspectResult = {
  companyId: string
  contactId: string
  opportunityId: string
  createdCompany: boolean
  createdContact: boolean
  createdOpportunity: boolean
  assignedOwner: LeadOwner
  usedAdminFallback: boolean
}

function isConflictError(err: unknown): boolean {
  return err instanceof AppError && err.statusCode === 409
}

function leadActor(owner: LeadOwner, tenantId: string): AuditActor {
  return {
    userId: owner.userId,
    userName: owner.userName,
    tenantId,
  }
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

async function notifyLeadAssignment(params: {
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
      title: params.title ?? 'Nuevo lead',
      message: params.message ?? `Nuevo lead: ${params.recordTitle}`,
      href: params.href,
      entityType: params.entityType,
      entityId: params.entityId,
    })
  } catch (err) {
    console.error('[lead-prospect] Error al notificar responsable:', err)
  }
}

async function findCompanyIdByTaxId(
  tenantId: string,
  taxId: string,
): Promise<string | null> {
  const kind = inferStoredTaxIdKind(taxId)
  const key = normalizeStoredTaxIdKey(taxId, kind)
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
    [tenantId, key],
  )
  return result.rows[0]?.id ?? null
}

async function findContactIdByEmail(
  tenantId: string,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const result = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_contacts
     WHERE deleted_at IS NULL
       AND tenant_id = $1
       AND email IS NOT NULL
       AND lower(trim(email)) = $2
     LIMIT 1`,
    [tenantId, normalized],
  )
  return result.rows[0]?.id ?? null
}

async function resolveLeadCompany(
  input: LeadProspectInput,
  owner: LeadOwner,
  actor: AuditActor,
): Promise<{ companyId: string; created: boolean }> {
  let companyId =
    (await findCompanyIdByTaxId(actor.tenantId, input.rut)) ??
    (await findActiveCompanyIdByName(input.company))

  if (companyId) {
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
        (await findCompanyIdByTaxId(actor.tenantId, input.rut)) ??
        (await findActiveCompanyIdByName(input.company))
      if (companyId) {
        return { companyId, created: false }
      }
    }
    throw err
  }
}

async function resolveLeadContact(
  input: LeadProspectInput,
  companyId: string,
  owner: LeadOwner,
  actor: AuditActor,
  leadSource: string,
  channelLabel: string,
): Promise<{ contactId: string; created: boolean }> {
  let contactId = await findContactIdByEmail(actor.tenantId, input.email)
  if (contactId) {
    return { contactId, created: false }
  }

  const noteParts = [
    input.message?.trim(),
    `Canal: ${leadSource} (${channelLabel})`,
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
      contactId = await findContactIdByEmail(actor.tenantId, input.email)
      if (contactId) {
        return { contactId, created: false }
      }
    }
    throw err
  }
}

async function createLeadOpportunity(params: {
  input: LeadProspectInput
  owner: LeadOwner
  actor: AuditActor
  companyId: string
  contactId: string
  leadSource: string
  channelLabel: string
  opportunityTitlePrefix: string
}): Promise<{ opportunityId: string }> {
  const descriptionParts = [
    params.input.message?.trim(),
    `Empleados: ${params.input.employees.trim()}`,
    `Canal: ${params.leadSource} (${params.channelLabel})`,
  ].filter(Boolean)

  const opportunity = await createOpportunity(
    {
      name: `${params.opportunityTitlePrefix} · ${params.input.company.trim()}`,
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

  await notifyLeadAssignment({
    owner: params.owner,
    recordTitle: opportunity.name,
    href: `/oportunidades/${opportunity.id}`,
    entityType: 'oportunidad',
    entityId: opportunity.id,
    title: 'Nueva oportunidad',
    message: `Nuevo lead: ${params.input.company.trim()}`,
  })

  return { opportunityId: opportunity.id }
}

/** Crea empresa y/o contacto si no existen; siempre crea una oportunidad nueva. */
export async function createLeadProspect(
  input: LeadProspectInput,
  options: CreateLeadProspectOptions,
): Promise<LeadProspectResult> {
  await assertValidRegionCommune(input.region, input.commune)

  const channelLabel = options.channelLabel ?? options.leadSource
  const opportunityTitlePrefix = options.opportunityTitlePrefix ?? 'Lead'

  return runWithTenantAsync(
    { tenantId: options.tenantId, tenantSlug: options.tenantSlug },
    async () => {
      const actor = leadActor(options.owner, options.tenantId)

      const { companyId, created: createdCompany } = await resolveLeadCompany(
        input,
        options.owner,
        actor,
      )
      const { contactId, created: createdContact } = await resolveLeadContact(
        input,
        companyId,
        options.owner,
        actor,
        options.leadSource,
        channelLabel,
      )

      const { opportunityId } = await createLeadOpportunity({
        input,
        owner: options.owner,
        actor,
        companyId,
        contactId,
        leadSource: options.leadSource,
        channelLabel,
        opportunityTitlePrefix,
      })

      if (createdContact) {
        await notifyLeadAssignment({
          owner: options.owner,
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
        assignedOwner: options.owner,
        usedAdminFallback: false,
      }
    },
  )
}
