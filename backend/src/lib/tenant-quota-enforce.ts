import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import type { AuditActor } from '../types/audit.js'
import {
  assertCanConsumeSeat,
  assertCanCreateRecord,
  assertCanSyncEntityFiles,
} from '../services/tenant-quota.service.js'
import { sumTenantFilesBytes } from '../repositories/tenant-quotas.repository.js'

export async function enforceRecordQuota(actor: AuditActor): Promise<void> {
  await assertCanCreateRecord(getTenantIdOrDefault(), actor)
}

export async function enforceSeatQuota(actor: AuditActor, seats = 1): Promise<void> {
  await assertCanConsumeSeat(getTenantIdOrDefault(), actor, seats)
}

export async function enforceFilesQuotaForTenantTotal(
  tenantId: string,
  actor: AuditActor,
  projectedTotalBytes: number,
): Promise<void> {
  await assertCanSyncEntityFiles(tenantId, actor, projectedTotalBytes)
}

export async function computeProjectedTenantFilesBytes(
  tenantId: string,
  entityType: string,
  entityId: string,
  incomingFiles: Array<{ size: number; storageKey: string; id?: string | null }>,
): Promise<number> {
  const { platformQuery } = await import('../db/tenant-query.js')
  const currentEntity = await platformQuery<{ total: string }>(
    `SELECT coalesce(sum(coalesce(size_bytes, octet_length(storage_key))), 0)::text AS total
     FROM crm_entity_files
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3::uuid`,
    [tenantId, entityType, entityId],
  )
  const entityCurrent = Number.parseInt(currentEntity.rows[0]?.total ?? '0', 10)
  const incomingTotal = incomingFiles.reduce(
    (sum, file) => sum + (file.size > 0 ? file.size : file.storageKey.length),
    0,
  )
  const tenantTotal = await sumTenantFilesBytes(tenantId)
  return tenantTotal - entityCurrent + incomingTotal
}
