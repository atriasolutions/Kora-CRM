import { env } from '../config/env.js'
import { getTenantById, getTenantBySlug } from '../repositories/tenants.repository.js'
import type { ResolvedIntegrationApiKey } from '../repositories/integration-api-keys.repository.js'
import { createLeadProspect, type LeadProspectInput } from '../services/lead-prospect.service.js'
import {
  resolveLeadAdminOwner,
  resolveLeadOwnerForTenant,
  tryResolveLeadOwnerByEmail,
  type LeadOwner,
} from '../services/lead-owner.service.js'
import { platformQuery } from '../db/tenant-query.js'
import { badRequest } from '../middleware/errors.js'
import type { IntegrationLeadInput } from '../validators/integration-lead.validator.js'

export type IntegrationLeadResult = {
  tenantId: string
  tenantSlug: string
  companyId: string
  contactId: string
  opportunityId: string
  createdCompany: boolean
  createdContact: boolean
  createdOpportunity: boolean
  assignedOwner: LeadOwner
  assigneeEmailRequested: string | null
  assigneeEmailUsed: string | null
  usedAdminFallback: boolean
}

async function lookupUserEmail(userId: string): Promise<string | null> {
  const result = await platformQuery<{ email: string | null }>(
    `SELECT email FROM crm_users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId],
  )
  return result.rows[0]?.email?.trim().toLowerCase() ?? null
}

async function assertTenantMatchesKey(
  apiKey: ResolvedIntegrationApiKey,
  input: IntegrationLeadInput,
): Promise<{ tenantId: string; tenantSlug: string }> {
  if (input.tenantId?.trim()) {
    if (input.tenantId.trim() !== apiKey.tenantId) {
      throw badRequest('tenantId no coincide con la API key utilizada.')
    }
    const tenant = await getTenantById(input.tenantId.trim())
    if (!tenant) throw badRequest('Tenant no encontrado.')
    return { tenantId: tenant.id, tenantSlug: tenant.slug }
  }

  if (input.tenantSlug?.trim()) {
    const normalized = input.tenantSlug.trim().toLowerCase()
    if (normalized !== apiKey.tenantSlug.toLowerCase()) {
      throw badRequest('tenantSlug no coincide con la API key utilizada.')
    }
    const tenant = await getTenantBySlug(normalized)
    if (!tenant) throw badRequest('Tenant no encontrado.')
    return { tenantId: tenant.id, tenantSlug: tenant.slug }
  }

  return { tenantId: apiKey.tenantId, tenantSlug: apiKey.tenantSlug }
}

function toLeadProspectInput(input: IntegrationLeadInput): LeadProspectInput {
  return {
    name: input.name,
    company: input.company,
    rut: input.rut,
    employees: input.employees,
    address: input.address,
    region: input.region,
    commune: input.commune,
    email: input.email,
    phone: input.phone,
    message: input.message,
  }
}

export async function ingestIntegrationLead(
  apiKey: ResolvedIntegrationApiKey,
  input: IntegrationLeadInput,
): Promise<IntegrationLeadResult> {
  const tenant = await assertTenantMatchesKey(apiKey, input)
  const assigneeEmailRequested =
    input.assigneeEmail?.trim().toLowerCase() ||
    apiKey.defaultAssigneeEmail?.trim().toLowerCase() ||
    null

  let owner: LeadOwner
  let usedAdminFallback = false

  if (assigneeEmailRequested) {
    const byEmail = await tryResolveLeadOwnerByEmail(
      tenant.tenantId,
      assigneeEmailRequested,
    )
    if (byEmail) {
      owner = byEmail
    } else {
      owner = await resolveLeadAdminOwner(tenant.tenantId)
      usedAdminFallback = true
    }
  } else {
    owner = await resolveLeadOwnerForTenant({ tenantId: tenant.tenantId })
  }

  const leadSource = apiKey.leadSource
  const channelLabel = input.externalId?.trim()
    ? `Integración · ref ${input.externalId.trim()}`
    : 'Integración externa'

  const prospect = await createLeadProspect(toLeadProspectInput(input), {
    tenantId: tenant.tenantId,
    tenantSlug: tenant.tenantSlug,
    owner,
    leadSource,
    opportunityTitlePrefix: 'Lead integración',
    channelLabel,
  })

  const assigneeEmailUsed = await lookupUserEmail(owner.userId)

  return {
    tenantId: tenant.tenantId,
    tenantSlug: tenant.tenantSlug,
    companyId: prospect.companyId,
    contactId: prospect.contactId,
    opportunityId: prospect.opportunityId,
    createdCompany: prospect.createdCompany,
    createdContact: prospect.createdContact,
    createdOpportunity: prospect.createdOpportunity,
    assignedOwner: owner,
    assigneeEmailRequested,
    assigneeEmailUsed,
    usedAdminFallback,
  }
}

/** Atajo para pruebas locales sin API key (solo desarrollo). */
export async function ingestIntegrationLeadForTenantSlug(
  tenantSlug: string,
  input: IntegrationLeadInput,
): Promise<IntegrationLeadResult> {
  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) throw badRequest('Tenant no encontrado.')

  const fakeKey: ResolvedIntegrationApiKey = {
    id: 'dev',
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    name: 'dev',
    defaultAssigneeEmail: input.assigneeEmail ?? null,
    leadSource: env.marketingLeadSource,
  }

  return ingestIntegrationLead(fakeKey, input)
}
