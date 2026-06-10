import type { AuthSession } from '@/lib/auth-session'
import { LOGIN_PATH } from '@/lib/auth-routes'
import { isCentralAppHost, resolveTenantSlugFromHostname, tenantAppOrigin } from '@/lib/tenant-host'

export function sessionTenantSlug(session: AuthSession | null | undefined): string | null {
  return session?.tenantSlug ?? null
}

/** Sesión activa en un subdominio distinto al tenant de la sesión (excepto operador de plataforma). */
export function isSessionOnWrongTenantHost(session: AuthSession | null | undefined): boolean {
  if (!session?.tenantSlug) return false
  if (session.isPlatformOperator) return false
  const hostSlug = resolveTenantSlugFromHostname(window.location.hostname)
  if (!hostSlug) return false
  return hostSlug !== session.tenantSlug
}

export function redirectToTenantApp(slug: string, path: string): void {
  window.location.replace(`${tenantAppOrigin(slug)}${path}`)
}

export function redirectToTenantLogin(slug: string): void {
  window.location.replace(`${tenantAppOrigin(slug)}${LOGIN_PATH}`)
}

/** Usuario autenticado en koracrm.cl (sin subdominio) debe ir al subdominio de su tenant. */
export function shouldRedirectAuthenticatedToTenantSubdomain(
  session: AuthSession | null | undefined,
): boolean {
  if (!session?.tenantSlug) return false
  return isCentralAppHost()
}
