import { pool } from '../db/pool.js'
import type { AuditActor } from '../types/audit.js'
import { notifyRecordOwnerAssignment } from '../services/notifications.service.js'

export async function resolveActiveOwnerUserId(
  name: string,
): Promise<string | null> {
  const normalized = name.trim()
  if (!normalized) return null
  const result = await pool.query<{ id: string }>(
    `SELECT id
     FROM crm_users
     WHERE deleted_at IS NULL
       AND status = 'Activo'
       AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [normalized],
  )
  return result.rows[0]?.id ?? null
}

export function normalizeOwnerName(name: string): string {
  return name.trim().toLowerCase()
}

export function ownerNameChanged(before: string, after: string): boolean {
  return normalizeOwnerName(before) !== normalizeOwnerName(after)
}

export function maybeNotifyRecordOwnerChange(params: {
  actor: AuditActor
  previousOwner: string
  nextOwner: string
  moduleLabel: string
  recordTitle: string
  href: string
  entityType: string
  entityId: string
}): void {
  const next = params.nextOwner.trim()
  const prev = params.previousOwner.trim()
  if (!next || !ownerNameChanged(prev, next)) return
  if (normalizeOwnerName(next) === normalizeOwnerName(params.actor.userName)) return
  void notifyRecordOwnerAssignment({
    actor: params.actor,
    assigneeName: next,
    moduleLabel: params.moduleLabel,
    recordTitle: params.recordTitle,
    href: params.href,
    entityType: params.entityType,
    entityId: params.entityId,
  }).catch(() => {
    /* ignore notification errors */
  })
}
