import { platformQuery } from '../db/tenant-query.js'
import { badRequest } from '../middleware/errors.js'

export type LeadOwner = { userId: string; userName: string }

const ACTIVE_MEMBERSHIP_STATUSES = ['active'] as const
const ACTIVE_USER_CLAUSE = `u.deleted_at IS NULL AND u.status = 'Activo'`

async function lookupActiveLeadOwner(
  sql: string,
  params: unknown[],
): Promise<LeadOwner | null> {
  const result = await platformQuery<{ id: string; name: string }>(sql, params)
  const row = result.rows[0]
  return row ? { userId: row.id, userName: row.name } : null
}

async function resolveTenantAdminOwner(tenantId: string): Promise<LeadOwner | null> {
  return lookupActiveLeadOwner(
    `SELECT u.id, u.name
     FROM crm_users u
     INNER JOIN crm_tenant_memberships m
       ON m.user_id = u.id AND m.tenant_id = $1 AND m.status = ANY($2::crm_membership_status[])
     INNER JOIN crm_access_profiles p ON p.id = m.profile_id AND p.tenant_id = $1
     WHERE ${ACTIVE_USER_CLAUSE}
       AND (p.system_key = 'admin' OR lower(p.name) = 'administrador')
     ORDER BY (p.system_key = 'admin') DESC, u.updated_at ASC
     LIMIT 1`,
    [tenantId, ACTIVE_MEMBERSHIP_STATUSES],
  )
}

/** Busca usuario activo por email en el tenant (sin fallback). */
export async function tryResolveLeadOwnerByEmail(
  tenantId: string,
  assigneeEmail: string,
): Promise<LeadOwner | null> {
  return lookupActiveLeadOwner(
    `SELECT u.id, u.name
     FROM crm_users u
     INNER JOIN crm_tenant_memberships m
       ON m.user_id = u.id AND m.tenant_id = $1 AND m.status = ANY($2::crm_membership_status[])
     WHERE ${ACTIVE_USER_CLAUSE} AND lower(trim(u.email)) = lower($3)
     LIMIT 1`,
    [tenantId, ACTIVE_MEMBERSHIP_STATUSES, assigneeEmail.trim()],
  )
}

/** Resuelve responsable del lead: email solicitado (si activo) o administrador del tenant. */
export async function resolveLeadOwnerForTenant(params: {
  tenantId: string
  assigneeEmail?: string | null
}): Promise<LeadOwner> {
  const email = params.assigneeEmail?.trim()
  if (email) {
    const byEmail = await tryResolveLeadOwnerByEmail(params.tenantId, email)
    if (byEmail) return byEmail
  }

  const admin = await resolveTenantAdminOwner(params.tenantId)
  if (admin) return admin

  throw badRequest(
    'No hay un usuario activo para asignar el lead. Verifica assigneeEmail o un administrador activo en el tenant.',
  )
}

export async function resolveLeadAdminOwner(tenantId: string): Promise<LeadOwner> {
  const admin = await resolveTenantAdminOwner(tenantId)
  if (admin) return admin
  throw badRequest(
    'No hay un administrador activo en el tenant para asignar el lead.',
  )
}
