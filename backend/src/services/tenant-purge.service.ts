import { platformQuery } from '../db/tenant-query.js'
import {
  SII_TENANT_TABLES,
  TENANT_SHELL_TABLES,
  TENANT_TRUNCATE_TABLES,
} from '../lib/tenant-purge-tables.js'
import { badRequest, forbidden, notFound } from '../middleware/errors.js'
import { getTenantById } from '../repositories/tenants.repository.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import type { TenantPublic } from '../types/tenant.js'

async function tableHasTenantColumn(table: string): Promise<boolean> {
  const tableName = table.includes('.') ? table.split('.').pop()! : table
  const schema = table.includes('.') ? table.split('.')[0]! : 'public'
  const result = await platformQuery<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 AND column_name = 'tenant_id'
     ) AS ok`,
    [schema, tableName],
  )
  return Boolean(result.rows[0]?.ok)
}

async function tableExists(table: string): Promise<boolean> {
  const result = await platformQuery<{ reg: string | null }>(
    `SELECT to_regclass($1) AS reg`,
    [table],
  )
  return Boolean(result.rows[0]?.reg)
}

async function deleteTenantRows(tenantId: string, tables: readonly string[]): Promise<void> {
  for (const table of tables) {
    if (!(await tableExists(table))) continue
    if (!(await tableHasTenantColumn(table))) continue
    await platformQuery(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId])
  }
}

async function assertDestructiveActionAllowed(
  tenantId: string,
  confirmSlug: string,
): Promise<TenantPublic> {
  if (tenantId === ATRIA_TENANT_ID) {
    throw forbidden(
      'La instancia principal de la plataforma (Atria) no puede vaciarse ni eliminarse desde aquí.',
    )
  }

  const tenant = await getTenantById(tenantId)
  if (!tenant) throw notFound('Instancia no encontrada.')

  const expected = tenant.slug.trim().toLowerCase()
  const provided = confirmSlug.trim().toLowerCase()
  if (!provided || provided !== expected) {
    throw badRequest(
      `Debes escribir exactamente «${tenant.slug}» para confirmar esta acción irreversible.`,
    )
  }

  return tenant
}

export type TenantAdminMeta = {
  id: string
  slug: string
  displayName: string
  kind: TenantPublic['kind']
  isProtected: boolean
}

export async function getTenantAdminMeta(tenantId: string): Promise<TenantAdminMeta> {
  const tenant = await getTenantById(tenantId)
  if (!tenant) throw notFound('Instancia no encontrada.')
  return {
    id: tenant.id,
    slug: tenant.slug,
    displayName: tenant.displayName,
    kind: tenant.kind,
    isProtected: tenant.id === ATRIA_TENANT_ID,
  }
}

/** Borra todos los registros operacionales; conserva usuarios, perfiles, cuotas y configuración base. */
export async function truncateTenantRecords(
  tenantId: string,
  confirmSlug: string,
): Promise<{ slug: string; displayName: string; requiresReLogin: true }> {
  const tenant = await assertDestructiveActionAllowed(tenantId, confirmSlug)

  await deleteTenantRows(tenantId, SII_TENANT_TABLES)
  await deleteTenantRows(tenantId, TENANT_TRUNCATE_TABLES)

  // Solo sesiones creadas en esta instancia; no invalidar accesos del mismo usuario en otros tenants.
  await platformQuery(`DELETE FROM crm_user_auth_sessions WHERE tenant_id = $1`, [tenantId])

  return { slug: tenant.slug, displayName: tenant.displayName, requiresReLogin: true }
}

async function deleteTenantScopedUsers(tenantId: string): Promise<void> {
  await platformQuery(
    `DELETE FROM crm_user_auth_sessions s
     WHERE s.user_id IN (
       SELECT m.user_id FROM crm_tenant_memberships m
       WHERE m.tenant_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM crm_tenant_memberships m2
           WHERE m2.user_id = m.user_id AND m2.tenant_id <> $1
         )
     )`,
    [tenantId],
  )

  if (await tableExists('crm_user_sessions') && (await tableHasTenantColumn('crm_user_sessions'))) {
    await platformQuery(
      `DELETE FROM crm_user_sessions s
       WHERE s.user_id IN (
         SELECT m.user_id FROM crm_tenant_memberships m
         WHERE m.tenant_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM crm_tenant_memberships m2
             WHERE m2.user_id = m.user_id AND m2.tenant_id <> $1
           )
       )`,
      [tenantId],
    )
  }

  await platformQuery(
    `DELETE FROM crm_user_verification_tokens t
     USING crm_users u
     WHERE t.user_id = u.id
       AND u.id IN (
         SELECT m.user_id FROM crm_tenant_memberships m
         WHERE m.tenant_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM crm_tenant_memberships m2
             WHERE m2.user_id = m.user_id AND m2.tenant_id <> $1
           )
       )`,
    [tenantId],
  )

  await platformQuery(
    `DELETE FROM crm_users u
     WHERE u.id IN (
       SELECT m.user_id FROM crm_tenant_memberships m
       WHERE m.tenant_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM crm_tenant_memberships m2
           WHERE m2.user_id = m.user_id AND m2.tenant_id <> $1
         )
     )`,
    [tenantId],
  )
}

/** Repunta profile_id / tenant_id global de usuarios que seguirán en otras instancias. */
async function repointMultiTenantUsersBeforeShellDelete(tenantId: string): Promise<void> {
  await platformQuery(
    `UPDATE crm_users u
     SET profile_id = sub.fallback_profile_id,
         tenant_id = CASE WHEN u.tenant_id = $1 THEN sub.fallback_tenant_id ELSE u.tenant_id END
     FROM (
       SELECT DISTINCT ON (m.user_id)
         m.user_id,
         m2.profile_id AS fallback_profile_id,
         m2.tenant_id AS fallback_tenant_id
       FROM crm_tenant_memberships m
       INNER JOIN crm_tenant_memberships m2
         ON m2.user_id = m.user_id
        AND m2.tenant_id <> $1
        AND m2.status IN ('active', 'invited', 'disabled')
       WHERE m.tenant_id = $1
       ORDER BY m.user_id, m2.is_default DESC, m2.created_at ASC
     ) sub
     WHERE u.id = sub.user_id
       AND (
         u.profile_id IN (SELECT id FROM crm_access_profiles WHERE tenant_id = $1)
         OR u.tenant_id = $1
       )`,
    [tenantId],
  )
}

async function deleteTenantShell(tenantId: string): Promise<void> {
  await platformQuery(`DELETE FROM crm_user_auth_sessions WHERE tenant_id = $1`, [tenantId])

  if (await tableExists('crm_user_sessions') && (await tableHasTenantColumn('crm_user_sessions'))) {
    await platformQuery(`DELETE FROM crm_user_sessions WHERE tenant_id = $1`, [tenantId])
  }

  await repointMultiTenantUsersBeforeShellDelete(tenantId)
  await deleteTenantScopedUsers(tenantId)

  await platformQuery(`DELETE FROM crm_tenant_memberships WHERE tenant_id = $1`, [tenantId])

  await platformQuery(
    `DELETE FROM crm_access_profile_permissions p
     USING crm_access_profiles ap
     WHERE p.profile_id = ap.id AND ap.tenant_id = $1`,
    [tenantId],
  )

  await platformQuery(`DELETE FROM crm_access_profiles WHERE tenant_id = $1`, [tenantId])

  await deleteTenantRows(tenantId, TENANT_SHELL_TABLES)
}

/** Elimina datos, membresías, perfiles y la fila del tenant. Irreversible. */
export async function destroyTenantCompletely(
  tenantId: string,
  confirmSlug: string,
): Promise<{ slug: string; displayName: string }> {
  const tenant = await assertDestructiveActionAllowed(tenantId, confirmSlug)

  await deleteTenantRows(tenantId, SII_TENANT_TABLES)
  await deleteTenantRows(tenantId, TENANT_TRUNCATE_TABLES)
  await deleteTenantShell(tenantId)

  await platformQuery(`DELETE FROM crm_tenants WHERE id = $1`, [tenantId])

  return { slug: tenant.slug, displayName: tenant.displayName }
}

/** Purga completa reutilizada por el job de trials vencidos. */
export async function purgeTenantLikeExpiredTrial(tenantId: string): Promise<void> {
  if (tenantId === ATRIA_TENANT_ID) return

  await deleteTenantRows(tenantId, SII_TENANT_TABLES)
  await deleteTenantRows(tenantId, TENANT_TRUNCATE_TABLES)
  await deleteTenantShell(tenantId)

  await platformQuery(`DELETE FROM crm_tenants WHERE id = $1`, [tenantId])
}
