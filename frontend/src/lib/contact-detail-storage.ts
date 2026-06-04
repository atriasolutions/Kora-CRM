import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'

export type ContactDetailOverride = Partial<
  Omit<ContactDetail, 'id' | 'activities' | 'notes' | 'opportunities' | 'files'>
>

export function loadContactDetailOverride(
  _contactId: string,
): ContactDetailOverride | null {
  return null
}

export function persistContactDetailOverride(
  _contactId: string,
  _override: ContactDetailOverride,
) {
  /* sin persistencia local */
}

export function removeContactDetailOverride(_contactId: string) {
  /* sin persistencia local */
}

const AUDIT_KEYS = [
  'createdAt',
  'createdById',
  'createdByName',
  'updatedAt',
  'updatedById',
  'updatedByName',
] as const

export function mergeDetailOverride(
  base: ContactDetail,
  override: ContactDetailOverride | null,
): ContactDetail {
  if (!override) return base
  const next = {
    ...base,
    ...override,
    owner: override.owner ?? base.owner,
    companyDetail: override.companyDetail ?? base.companyDetail,
    tags: override.tags ?? base.tags,
    nextActivity: override.nextActivity ?? base.nextActivity,
  }
  for (const key of AUDIT_KEYS) {
    const v = override[key as keyof typeof override]
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      ;(next as Record<string, unknown>)[key] = base[key]
    }
  }
  return next
}

const LIST_FIELD_KEYS = [
  'name',
  'subtitle',
  'avatarUrl',
  'companyId',
  'company',
  'email',
  'phone',
  'role',
  'status',
  'lastContactLabel',
  'lastOutreachAt',
  'lastOutreachChannel',
  'lastOutreachResult',
  'lastOutreachLabel',
  'reachabilityStatus',
  'outreachAttemptCount',
  'rut',
  'mobilePhone',
  'streetAddress',
  'region',
  'commune',
  'city',
  'linkedIn',
  'source',
  'initialNote',
] as const satisfies readonly (keyof ContactListItem)[]

export function applyContactListOverride(
  base: ContactListItem,
  override: ContactDetailOverride | null,
): ContactListItem {
  if (!override) return base
  const next: ContactListItem = { ...base }
  for (const key of LIST_FIELD_KEYS) {
    const value = override[key]
    if (value !== undefined) {
      ;(next as Record<string, unknown>)[key] = value
    }
  }
  if (override.owner?.name) {
    next.ownerName = override.owner.name
  }
  return next
}
