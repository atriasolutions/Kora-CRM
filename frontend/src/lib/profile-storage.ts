import type { AccessProfile } from '@/types/access-profile'

const STORAGE_KEY = 'kora-profiles-registry-v1'

export function loadStoredProfiles(): AccessProfile[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AccessProfile[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveStoredProfiles(profiles: AccessProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

export function clearStoredProfiles(): void {
  localStorage.removeItem(STORAGE_KEY)
}
