import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { UserListItem } from '@/data/users.mock'

export type UserDetailOverride = Partial<UserListItem> & {
  profileId?: string
  phone?: string
  department?: string
  jobTitle?: string
  bio?: string
  timezone?: string
  language?: string
  birthDate?: string
  teams?: string[]
  twoFactorEnabled?: boolean
}

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}-crm-user-detail-${id}`
}

export function loadUserDetailOverride(id: string): UserDetailOverride | null {
  if (!isLocalDetailStorageActive()) return null
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (!raw) return null
    return JSON.parse(raw) as UserDetailOverride
  } catch {
    return null
  }
}

export function persistUserDetailOverride(
  id: string,
  override: UserDetailOverride,
): void {
  if (!isLocalDetailStorageActive()) return
  try {
    localStorage.setItem(storageKey(id), JSON.stringify(override))
  } catch {
    /* ignore */
  }
}

export function applyUserListOverride(
  base: UserListItem,
  override: UserDetailOverride | null,
): UserListItem {
  if (!override) return base
  return { ...base, ...override, id: base.id }
}
