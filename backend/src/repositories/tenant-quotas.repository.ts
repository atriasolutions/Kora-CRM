import { platformQuery } from '../db/tenant-query.js'
import { GUEST_COUNT_STATUSES, SEAT_COUNT_STATUSES } from '../lib/tenant-quota-modules.js'
import type { TenantQuotasDto } from '../types/tenant-quota.js'

export type TenantQuotasRow = {
  tenant_id: string
  max_active_users: number | null
  max_records_bytes: string | number | null
  max_files_bytes: string | number | null
  grace_percent: string | number
  updated_at: Date
  updated_by_id: string | null
}

export type TenantUsageCacheRow = {
  tenant_id: string
  seats_used: number
  records_bytes: string | number
  files_bytes: string | number
  records_by_module: Record<string, number>
  files_by_module: Record<string, number>
  computed_at: Date
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function mapQuotasRow(row: TenantQuotasRow | undefined): TenantQuotasDto {
  if (!row) {
    return {
      maxActiveUsers: null,
      maxRecordsBytes: null,
      maxFilesBytes: null,
      gracePercent: 10,
    }
  }
  return {
    maxActiveUsers: row.max_active_users,
    maxRecordsBytes: toNumber(row.max_records_bytes),
    maxFilesBytes: toNumber(row.max_files_bytes),
    gracePercent: Number(row.grace_percent) || 10,
  }
}

export async function getTenantQuotasRow(tenantId: string): Promise<TenantQuotasRow | undefined> {
  const result = await platformQuery<TenantQuotasRow>(
    `SELECT tenant_id, max_active_users, max_records_bytes, max_files_bytes,
            grace_percent, updated_at, updated_by_id
     FROM crm_tenant_quotas
     WHERE tenant_id = $1`,
    [tenantId],
  )
  return result.rows[0]
}

export async function upsertTenantQuotas(
  tenantId: string,
  input: {
    maxActiveUsers: number | null
    maxRecordsBytes: number | null
    maxFilesBytes: number | null
    gracePercent: number
    updatedById: string
  },
): Promise<TenantQuotasDto> {
  const result = await platformQuery<TenantQuotasRow>(
    `INSERT INTO crm_tenant_quotas (
       tenant_id, max_active_users, max_records_bytes, max_files_bytes,
       grace_percent, updated_by_id
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id) DO UPDATE SET
       max_active_users = EXCLUDED.max_active_users,
       max_records_bytes = EXCLUDED.max_records_bytes,
       max_files_bytes = EXCLUDED.max_files_bytes,
       grace_percent = EXCLUDED.grace_percent,
       updated_by_id = EXCLUDED.updated_by_id,
       updated_at = now()
     RETURNING tenant_id, max_active_users, max_records_bytes, max_files_bytes,
               grace_percent, updated_at, updated_by_id`,
    [
      tenantId,
      input.maxActiveUsers,
      input.maxRecordsBytes,
      input.maxFilesBytes,
      input.gracePercent,
      input.updatedById,
    ],
  )
  return mapQuotasRow(result.rows[0])
}

export async function insertDefaultTrialQuotas(tenantId: string): Promise<void> {
  const oneGb = 1024 * 1024 * 1024
  await platformQuery(
    `INSERT INTO crm_tenant_quotas (
       tenant_id, max_active_users, max_records_bytes, max_files_bytes, grace_percent
     ) VALUES ($1, 5, $2, $2, 10)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId, oneGb],
  )
}

export async function countSeatsUsed(tenantId: string): Promise<number> {
  const result = await platformQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_users u
     INNER JOIN crm_tenant_memberships m
       ON m.user_id = u.id AND m.tenant_id = $1
     INNER JOIN crm_access_profiles p
       ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
     WHERE u.deleted_at IS NULL
       AND COALESCE(u.is_platform_operator, false) = false
       AND COALESCE(p.system_key, '') <> 'guest'
       AND u.status::text = ANY($2::text[])`,
    [tenantId, SEAT_COUNT_STATUSES],
  )
  return Number.parseInt(result.rows[0]?.count ?? '0', 10)
}

export async function getUsageCacheRow(
  tenantId: string,
): Promise<TenantUsageCacheRow | undefined> {
  const result = await platformQuery<TenantUsageCacheRow>(
    `SELECT tenant_id, seats_used, records_bytes, files_bytes,
            records_by_module, files_by_module, computed_at
     FROM crm_tenant_usage_cache
     WHERE tenant_id = $1`,
    [tenantId],
  )
  return result.rows[0]
}

export async function upsertUsageCache(
  tenantId: string,
  data: {
    seatsUsed: number
    recordsBytes: number
    filesBytes: number
    recordsByModule: Record<string, number>
    filesByModule: Record<string, number>
  },
): Promise<void> {
  await platformQuery(
    `INSERT INTO crm_tenant_usage_cache (
       tenant_id, seats_used, records_bytes, files_bytes,
       records_by_module, files_by_module, computed_at
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, now())
     ON CONFLICT (tenant_id) DO UPDATE SET
       seats_used = EXCLUDED.seats_used,
       records_bytes = EXCLUDED.records_bytes,
       files_bytes = EXCLUDED.files_bytes,
       records_by_module = EXCLUDED.records_by_module,
       files_by_module = EXCLUDED.files_by_module,
       computed_at = now()`,
    [
      tenantId,
      data.seatsUsed,
      data.recordsBytes,
      data.filesBytes,
      JSON.stringify(data.recordsByModule),
      JSON.stringify(data.filesByModule),
    ],
  )
}

export async function hasRecentQuotaWarning(
  tenantId: string,
  kind: string,
): Promise<boolean> {
  const result = await platformQuery<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM crm_tenant_quota_events
       WHERE tenant_id = $1
         AND kind = $2
         AND level = 'warning'
         AND triggered_at > now() - interval '7 days'
     ) AS exists`,
    [tenantId, kind],
  )
  return Boolean(result.rows[0]?.exists)
}

export async function insertQuotaEvent(
  tenantId: string,
  kind: string,
  level: 'warning' | 'blocked',
): Promise<void> {
  await platformQuery(
    `INSERT INTO crm_tenant_quota_events (tenant_id, kind, level)
     VALUES ($1, $2, $3)`,
    [tenantId, kind, level],
  )
}

export async function clearQuotaWarningsIfBelowLimit(
  tenantId: string,
  kind: string,
): Promise<void> {
  await platformQuery(
    `DELETE FROM crm_tenant_quota_events
     WHERE tenant_id = $1 AND kind = $2 AND level = 'warning'`,
    [tenantId, kind],
  )
}

/** Bytes totales de archivos del tenant (para validación rápida). */
export async function sumTenantFilesBytes(tenantId: string): Promise<number> {
  const result = await platformQuery<{ total: string }>(
    `SELECT coalesce(sum(
       coalesce(size_bytes, octet_length(storage_key))
     ), 0)::text AS total
     FROM crm_entity_files
     WHERE tenant_id = $1`,
    [tenantId],
  )
  return Number.parseInt(result.rows[0]?.total ?? '0', 10)
}

export async function getUserStatus(userId: string): Promise<string | null> {
  const result = await platformQuery<{ status: string }>(
    `SELECT status::text FROM crm_users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  )
  return result.rows[0]?.status ?? null
}

export async function countGuestProfileUsers(tenantId: string): Promise<number> {
  const result = await platformQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_tenant_memberships m
     INNER JOIN crm_users u ON u.id = m.user_id AND u.deleted_at IS NULL
     INNER JOIN crm_access_profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
     WHERE m.tenant_id = $1
       AND COALESCE(u.is_platform_operator, false) = false
       AND p.system_key = 'guest'
       AND u.status::text = ANY($2::text[])`,
    [tenantId, GUEST_COUNT_STATUSES],
  )
  return Number.parseInt(result.rows[0]?.count ?? '0', 10)
}

export async function countGuestProfileUsersExcluding(
  tenantId: string,
  excludeUserId: string,
): Promise<number> {
  const result = await platformQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_tenant_memberships m
     INNER JOIN crm_users u ON u.id = m.user_id AND u.deleted_at IS NULL
     INNER JOIN crm_access_profiles p ON p.id = m.profile_id AND p.tenant_id = m.tenant_id
     WHERE m.tenant_id = $1
       AND COALESCE(u.is_platform_operator, false) = false
       AND p.system_key = 'guest'
       AND u.status::text = ANY($2::text[])
       AND m.user_id <> $3`,
    [tenantId, GUEST_COUNT_STATUSES, excludeUserId],
  )
  return Number.parseInt(result.rows[0]?.count ?? '0', 10)
}
