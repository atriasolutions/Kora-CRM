import {
  gbToBytes,
  statusCountsTowardGuestQuota,
  statusCountsTowardSeat,
} from '../lib/tenant-quota-modules.js'
import { maxGuestUsersForTenant } from '../lib/default-tenant-profiles.js'
import { forbidden, conflict } from '../middleware/errors.js'
import {
  clearQuotaWarningsIfBelowLimit,
  countGuestProfileUsers,
  countGuestProfileUsersExcluding,
  countSeatsUsed,
  getTenantQuotasRow,
  getUserStatus,
  hasRecentQuotaWarning,
  insertQuotaEvent,
  mapQuotasRow,
  upsertTenantQuotas,
} from '../repositories/tenant-quotas.repository.js'
import {
  getTenantUsage,
  refreshTenantUsage,
  resolveQuotaLevel,
} from '../services/tenant-usage.service.js'
import { notifyTenantQuotaWarning } from '../services/notifications.service.js'
import { isGuestProfileId } from './default-tenant-profiles.service.js'
import type { AuditActor } from '../types/audit.js'
import type {
  QuotaKind,
  TenantQuotasDto,
  TenantUsageDto,
  UpdateTenantQuotasInput,
} from '../types/tenant-quota.js'

function assertPlatformOperator(actor: AuditActor): void {
  if (!actor.isPlatformOperator) {
    throw forbidden('Solo el operador de plataforma puede gestionar cuotas de instancia.')
  }
}

function hardLimit(limit: number, gracePercent: number): number {
  return limit * (1 + gracePercent / 100)
}

function formatGb(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2)
}

async function maybeNotifyQuotaWarning(
  tenantId: string,
  kind: QuotaKind,
  usage: number,
  limit: number,
): Promise<void> {
  if (usage <= limit) {
    await clearQuotaWarningsIfBelowLimit(tenantId, kind)
    return
  }
  const already = await hasRecentQuotaWarning(tenantId, kind)
  if (already) return
  await insertQuotaEvent(tenantId, kind, 'warning')
  void notifyTenantQuotaWarning(tenantId, kind, usage, limit).catch(() => {
    /* no bloquear operación */
  })
}

export async function getQuotasForTenant(tenantId: string): Promise<TenantQuotasDto> {
  return mapQuotasRow(await getTenantQuotasRow(tenantId))
}

export async function updateQuotasForTenant(
  tenantId: string,
  input: UpdateTenantQuotasInput,
  actor: AuditActor,
): Promise<TenantQuotasDto> {
  assertPlatformOperator(actor)
  const existing = mapQuotasRow(await getTenantQuotasRow(tenantId))

  const maxActiveUsers =
    input.maxActiveUsers !== undefined ? input.maxActiveUsers : existing.maxActiveUsers
  const maxRecordsBytes =
    input.maxRecordsGb !== undefined
      ? input.maxRecordsGb == null
        ? null
        : gbToBytes(input.maxRecordsGb)
      : existing.maxRecordsBytes
  const maxFilesBytes =
    input.maxFilesGb !== undefined
      ? input.maxFilesGb == null
        ? null
        : gbToBytes(input.maxFilesGb)
      : existing.maxFilesBytes
  const gracePercent =
    input.gracePercent !== undefined ? input.gracePercent : existing.gracePercent

  return upsertTenantQuotas(tenantId, {
    maxActiveUsers,
    maxRecordsBytes,
    maxFilesBytes,
    gracePercent,
    updatedById: actor.userId,
  })
}

export async function getUsageForTenant(
  tenantId: string,
  options?: { forceRefresh?: boolean },
): Promise<TenantUsageDto> {
  return getTenantUsage(tenantId, options)
}

export async function assertCanAssignGuestProfile(
  tenantId: string,
  actor: AuditActor,
  profileId: string,
  options?: { excludeUserId?: string; additional?: number },
): Promise<void> {
  if (actor.isPlatformOperator) return

  const isGuest = await isGuestProfileId(profileId, tenantId)
  if (!isGuest) return

  const quotas = mapQuotasRow(await getTenantQuotasRow(tenantId))
  const maxGuest = maxGuestUsersForTenant(quotas.maxActiveUsers)
  if (maxGuest == null) return

  const used = options?.excludeUserId
    ? await countGuestProfileUsersExcluding(tenantId, options.excludeUserId)
    : await countGuestProfileUsers(tenantId)
  const additional = options?.additional ?? 1

  if (used + additional > maxGuest) {
    throw conflict(
      `La instancia alcanzó el límite de ${maxGuest} usuarios con perfil Invitado (${quotas.maxActiveUsers} usuarios × 10).`,
    )
  }
}

export async function assertCanConsumeSeat(
  tenantId: string,
  actor: AuditActor,
  additionalSeats = 1,
): Promise<void> {
  if (actor.isPlatformOperator) return

  const quotas = mapQuotasRow(await getTenantQuotasRow(tenantId))
  if (quotas.maxActiveUsers == null) return

  const used = await countSeatsUsed(tenantId)
  if (used + additionalSeats > quotas.maxActiveUsers) {
    throw conflict(
      `La instancia alcanzó el límite de ${quotas.maxActiveUsers} usuarios activos o por verificar. Inactiva un usuario antes de agregar otro.`,
    )
  }
}

export async function assertCanConsumeSeatForUserStatusChange(
  tenantId: string,
  actor: AuditActor,
  previousStatus: string,
  nextStatus: string,
  options?: { profileId?: string },
): Promise<void> {
  const wasCounting = statusCountsTowardSeat(previousStatus)
  const willCount = statusCountsTowardSeat(nextStatus)
  if (!willCount || wasCounting) return
  if (options?.profileId && (await isGuestProfileId(options.profileId, tenantId))) return
  await assertCanConsumeSeat(tenantId, actor, 1)
}

export async function assertCanConsumeGuestQuotaForUserStatusChange(
  tenantId: string,
  actor: AuditActor,
  previousStatus: string,
  nextStatus: string,
  options: { profileId: string; excludeUserId: string },
): Promise<void> {
  const wasCounting = statusCountsTowardGuestQuota(previousStatus)
  const willCount = statusCountsTowardGuestQuota(nextStatus)
  if (!willCount || wasCounting) return
  if (!(await isGuestProfileId(options.profileId, tenantId))) return
  await assertCanAssignGuestProfile(tenantId, actor, options.profileId, {
    excludeUserId: options.excludeUserId,
  })
}

export async function assertCanCreateRecord(
  tenantId: string,
  actor: AuditActor,
): Promise<void> {
  if (actor.isPlatformOperator) return

  const quotas = mapQuotasRow(await getTenantQuotasRow(tenantId))
  if (quotas.maxRecordsBytes == null) return

  const usage = await refreshTenantUsage(tenantId)
  const limit = quotas.maxRecordsBytes
  const hard = hardLimit(limit, quotas.gracePercent)
  const projected = usage.recordsBytes

  if (projected > hard) {
    throw conflict(
      `No se pueden crear más registros: la instancia superó el límite de almacenamiento de registros (${formatGb(limit)} GB, tolerancia ${quotas.gracePercent}%).`,
    )
  }

  if (projected > limit) {
    await maybeNotifyQuotaWarning(tenantId, 'records', projected, limit)
  } else {
    await clearQuotaWarningsIfBelowLimit(tenantId, 'records')
  }
}

export async function assertCanAddFiles(
  tenantId: string,
  actor: AuditActor,
  newTotalBytes: number,
): Promise<void> {
  if (actor.isPlatformOperator) return

  const quotas = mapQuotasRow(await getTenantQuotasRow(tenantId))
  if (quotas.maxFilesBytes == null) return

  const limit = quotas.maxFilesBytes
  const hard = hardLimit(limit, quotas.gracePercent)

  if (newTotalBytes > hard) {
    throw conflict(
      `No se pueden subir más archivos: la instancia superó el límite de almacenamiento de archivos (${formatGb(limit)} GB, tolerancia ${quotas.gracePercent}%).`,
    )
  }

  if (newTotalBytes > limit) {
    await maybeNotifyQuotaWarning(tenantId, 'files', newTotalBytes, limit)
  } else {
    await clearQuotaWarningsIfBelowLimit(tenantId, 'files')
  }
}

/** Valida cupo de archivos tras sync: total proyectado del tenant. */
export async function assertCanSyncEntityFiles(
  tenantId: string,
  actor: AuditActor,
  projectedTotalBytes: number,
): Promise<void> {
  await assertCanAddFiles(tenantId, actor, projectedTotalBytes)
}

export async function getUserStatusForQuota(userId: string): Promise<string> {
  return (await getUserStatus(userId)) ?? 'Inactivo'
}

export { resolveQuotaLevel }
