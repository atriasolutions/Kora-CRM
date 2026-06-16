import { platformQuery } from '../db/tenant-query.js'
import { env } from '../config/env.js'
import { createLeadProspect } from '../services/lead-prospect.service.js'
import {
  resolveLeadOwnerForTenant,
  tryResolveLeadOwnerByEmail,
  type LeadOwner,
} from '../services/lead-owner.service.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import type { TrialLeadInput } from '../validators/marketing.validator.js'

const ACTIVE_MEMBERSHIP_STATUSES = ['active'] as const

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
  const activeUserClause = `u.deleted_at IS NULL AND u.status = 'Activo'`

  if (env.marketingLeadOwnerUserId) {
    const owner = await lookupActiveMarketingLeadOwner(
      `SELECT u.id, u.name
       FROM crm_users u
       INNER JOIN crm_tenant_memberships m
         ON m.user_id = u.id AND m.tenant_id = $1 AND m.status = ANY($2::crm_membership_status[])
       WHERE ${activeUserClause} AND u.id = $3::uuid
       LIMIT 1`,
      [tenantId, ACTIVE_MEMBERSHIP_STATUSES, env.marketingLeadOwnerUserId],
    )
    if (owner) return owner
  }

  const email = env.marketingLeadOwnerEmail
  if (email) {
    const owner = await tryResolveLeadOwnerByEmail(tenantId, email)
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
    [tenantId, ACTIVE_MEMBERSHIP_STATUSES, configuredName],
  )
  if (owner) return owner

  const admin = await resolveLeadOwnerForTenant({ tenantId })
  return admin ?? resolveDemoLeadOwner()
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
  const owner = await resolveMarketingLeadOwner()

  const result = await createLeadProspect(input, {
    tenantId: ATRIA_TENANT_ID,
    tenantSlug: 'atriasolutions',
    owner,
    leadSource: env.marketingLeadSource,
    opportunityTitlePrefix: 'Demo gratis',
    channelLabel: 'koracrm.cl/prueba-gratis',
  })

  return {
    companyId: result.companyId,
    contactId: result.contactId,
    opportunityId: result.opportunityId,
    createdCompany: result.createdCompany,
    createdContact: result.createdContact,
    createdOpportunity: result.createdOpportunity,
  }
}
