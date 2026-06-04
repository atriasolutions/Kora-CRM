import { seedAuditFromOwner, type RecordAuditFields } from '@/lib/record-audit'

type WithOptionalAudit = Partial<RecordAuditFields>

export function hasRecordAudit(item: WithOptionalAudit): item is RecordAuditFields {
  return Boolean(
    item.createdAt &&
      item.createdById &&
      item.createdByName &&
      item.updatedAt &&
      item.updatedById &&
      item.updatedByName,
  )
}

/** Aplica auditoría demo si el registro aún no la tiene. */
export function ensureRecordAudit<T extends WithOptionalAudit>(
  item: T,
  ownerName?: string | null,
  legacyCreatedAt?: string,
): T & RecordAuditFields {
  if (hasRecordAudit(item)) return item as T & RecordAuditFields
  return { ...item, ...seedAuditFromOwner(ownerName, legacyCreatedAt ?? item.createdAt) }
}

export function ensureRecordAuditList<T extends object>(
  items: T[],
  getOwner: (item: T) => string,
  getLegacyDate?: (item: T) => string | undefined,
): (T & RecordAuditFields)[] {
  return items.map((item) =>
    ensureRecordAudit(item as T & WithOptionalAudit, getOwner(item), getLegacyDate?.(item)),
  )
}

export function defaultSeedAuditIso(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}
