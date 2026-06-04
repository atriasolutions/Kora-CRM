import { STORAGE_PREFIX } from '@/config/brand'

const SESSION_KEY = `${STORAGE_PREFIX}-auth-session`

export type AuthSession = {
  userId: string
  email: string
  name: string
  token?: string
  profileId?: string
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.userId || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
