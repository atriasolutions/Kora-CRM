import { APP_HOME_PATH } from '@/lib/app-routes'
import { centralLoginUrl, isCentralAppHost } from '@/lib/tenant-host'

export const LOGIN_PATH = '/login'

export function getLoginPath(): string {
  return LOGIN_PATH
}

/** URL de login: central (koracrm.cl) desde subdominios de tenant; relativa en host central. */
export function resolveLoginRedirectUrl(): string {
  if (typeof window === 'undefined') return centralLoginUrl()
  return isCentralAppHost()
    ? `${window.location.origin}${LOGIN_PATH}`
    : centralLoginUrl()
}

/** Tras cerrar sesión: login central con limpieza forzada de sesión. */
export function resolveLogoutRedirectUrl(): string {
  if (typeof window === 'undefined') {
    return `${centralLoginUrl()}?loggedOut=1`
  }
  return isCentralAppHost()
    ? `${window.location.origin}${LOGIN_PATH}?loggedOut=1`
    : `${centralLoginUrl()}?loggedOut=1`
}

export function getPostLoginRedirect(
  state: unknown,
  fallback = APP_HOME_PATH,
): string {
  if (!state || typeof state !== 'object') return fallback
  const from = (state as { from?: { pathname?: string; search?: string } }).from
  if (!from?.pathname || from.pathname === LOGIN_PATH) return fallback
  return `${from.pathname}${from.search ?? ''}`
}
