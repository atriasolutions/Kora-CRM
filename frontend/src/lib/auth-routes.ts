import { APP_HOME_PATH } from '@/lib/app-routes'

export const LOGIN_PATH = '/login'

export function getLoginPath(): string {
  return LOGIN_PATH
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
