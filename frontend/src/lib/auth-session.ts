import { STORAGE_PREFIX } from '@/config/brand'
import { getPlatformDomain } from '@/lib/tenant-host'

const SESSION_KEY = `${STORAGE_PREFIX}-auth-session`
const AUTH_COOKIE = `${STORAGE_PREFIX}-auth-session`
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60

export type AuthSession = {
  userId: string
  email: string
  name: string
  token?: string
  profileId?: string
  tenantId?: string
  tenantSlug?: string
  isPlatformOperator?: boolean
}

function parseAuthSession(raw: string | null | undefined): AuthSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.userId || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

function authCookieDomain(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const domain = getPlatformDomain()
  const host = window.location.hostname.toLowerCase()
  if (host === domain || host.endsWith(`.${domain}`)) {
    return `.${domain}`
  }
  return undefined
}

function readAuthCookie(): AuthSession | null {
  if (typeof document === 'undefined') return null
  const prefix = `${AUTH_COOKIE}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    return parseAuthSession(decodeURIComponent(trimmed.slice(prefix.length)))
  }
  return null
}

function writeAuthCookie(session: AuthSession): void {
  const domain = authCookieDomain()
  if (!domain) return
  const value = encodeURIComponent(JSON.stringify(session))
  document.cookie = `${AUTH_COOKIE}=${value}; Domain=${domain}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; Secure; SameSite=Lax`
}

function clearAuthCookie(): void {
  const domain = authCookieDomain()
  if (!domain) return
  document.cookie = `${AUTH_COOKIE}=; Domain=${domain}; Path=/; Max-Age=0; Secure; SameSite=Lax`
}

export function loadAuthSession(): AuthSession | null {
  const fromLocal = parseAuthSession(localStorage.getItem(SESSION_KEY))
  if (fromLocal) return fromLocal

  const fromCookie = readAuthCookie()
  if (fromCookie) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(fromCookie))
    return fromCookie
  }

  return null
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  writeAuthCookie(session)
}

export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY)
  clearAuthCookie()
}
