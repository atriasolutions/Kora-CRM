import { STORAGE_PREFIX } from '@/config/brand'
import { getPlatformDomain } from '@/lib/tenant-host'

const SESSION_KEY = `${STORAGE_PREFIX}-auth-session`
const AUTH_COOKIE = `${STORAGE_PREFIX}-auth-session`
const LEGACY_LOGOUT_MARKER = `${STORAGE_PREFIX}-logged-out`
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

function cookieVariants(name: string, value: string, maxAgeSec: number): string[] {
  const expires =
    maxAgeSec <= 0
      ? 'Thu, 01 Jan 1970 00:00:00 GMT'
      : new Date(Date.now() + maxAgeSec * 1000).toUTCString()
  const maxAge = maxAgeSec <= 0 ? 0 : maxAgeSec
  const encoded = encodeURIComponent(value)
  const base = `${name}=${encoded}; Path=/; Max-Age=${maxAge}; Expires=${expires}; Secure; SameSite=Lax`
  const domain = authCookieDomain()
  if (!domain) return [base]
  const bareDomain = domain.startsWith('.') ? domain.slice(1) : domain
  return [
    base,
    `${base}; Domain=${domain}`,
    `${base}; Domain=${bareDomain}`,
  ]
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === 'undefined') return
  for (const cookie of cookieVariants(name, value, maxAgeSec)) {
    document.cookie = cookie
  }
}

function clearCookie(name: string): void {
  writeCookie(name, '', 0)
}

function readAuthCookie(): AuthSession | null {
  if (typeof document === 'undefined') return null
  const prefix = `${AUTH_COOKIE}=`
  let last: AuthSession | null = null
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    const parsed = parseAuthSession(decodeURIComponent(trimmed.slice(prefix.length)))
    if (parsed) last = parsed
  }
  return last
}

function writeAuthCookie(session: AuthSession): void {
  if (!authCookieDomain()) return
  writeCookie(AUTH_COOKIE, JSON.stringify(session), SESSION_MAX_AGE_SEC)
}

function clearAllAuthCookies(): void {
  clearCookie(AUTH_COOKIE)
  clearCookie(LEGACY_LOGOUT_MARKER)
}

/** Resuelve desincronización localStorage (por subdominio) vs cookie compartida. */
function reconcileStoredSessions(
  fromLocal: AuthSession | null,
  fromCookie: AuthSession | null,
): AuthSession | null {
  if (!fromLocal?.token && !fromCookie?.token) return null
  if (fromLocal?.token && !fromCookie?.token) return fromLocal
  if (!fromLocal?.token && fromCookie?.token) return fromCookie
  if (fromLocal!.token === fromCookie!.token) return fromLocal

  // Tokens distintos: priorizar localStorage del subdominio actual (último login aquí)
  // y alinear la cookie compartida para no restaurar otra cuenta en refresh.
  if (fromLocal?.token) {
    writeAuthCookie(fromLocal)
    return fromLocal
  }
  return fromCookie
}

export function loadAuthSession(): AuthSession | null {
  const fromLocal = parseAuthSession(localStorage.getItem(SESSION_KEY))
  const fromCookie = readAuthCookie()
  const resolved = reconcileStoredSessions(fromLocal, fromCookie)
  if (!resolved) return null

  localStorage.setItem(SESSION_KEY, JSON.stringify(resolved))
  return resolved
}

export function saveAuthSession(session: AuthSession): void {
  clearAllAuthCookies()
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  writeAuthCookie(session)
}

export function clearAuthSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }
  clearAllAuthCookies()
}

export const markLoggedOut = clearAuthSession

export function consumePostLogoutLanding(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('loggedOut') !== '1') return false
  clearAuthSession()
  params.delete('loggedOut')
  const search = params.toString()
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
  window.history.replaceState({}, '', nextUrl)
  return true
}
