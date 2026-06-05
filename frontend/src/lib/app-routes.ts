/** Pantalla de bienvenida (sin permisos). Logo y post-login. */
export const APP_HOME_PATH = '/'

/** Panel de métricas; requiere permiso de módulo dashboard. */
export const DASHBOARD_PATH = '/dashboard'

/** Rutas accesibles para cualquier usuario autenticado. */
export const PUBLIC_APP_PATHS = new Set<string>([APP_HOME_PATH])

export function isPublicAppPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return PUBLIC_APP_PATHS.has(normalized)
}
