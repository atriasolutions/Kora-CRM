/** Pantalla de bienvenida autenticada (post-login). */
export const APP_HOME_PATH = '/inicio'

/** Panel de métricas; requiere permiso de módulo dashboard. */
export const DASHBOARD_PATH = '/dashboard'

/** Rutas accesibles para cualquier usuario autenticado (sin permiso de módulo). */
export const PUBLIC_APP_PATHS = new Set<string>([APP_HOME_PATH])

export function isPublicAppPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return PUBLIC_APP_PATHS.has(normalized)
}
