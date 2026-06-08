/** Rutas públicas del sitio marketing (sin autenticación). */
export const MARKETING_HOME_PATH = '/'
/** @deprecated Redirige a inicio — la página producto duplicaba contenido de la home. */
export const MARKETING_PRODUCT_PATH = '/producto'
export const MARKETING_FEATURES_PATH = '/funcionalidades'
export const MARKETING_PRICING_PATH = '/planes'
export const MARKETING_TRIAL_PATH = '/prueba-gratis'
export const MARKETING_SUPPORT_PATH = '/soporte'

export type MarketingNavItem = {
  label: string
  path: string
}

export const MARKETING_NAV: MarketingNavItem[] = [
  { label: 'Inicio', path: MARKETING_HOME_PATH },
  { label: 'Funcionalidades', path: MARKETING_FEATURES_PATH },
  { label: 'Planes', path: MARKETING_PRICING_PATH },
  { label: 'Soporte', path: MARKETING_SUPPORT_PATH },
  { label: 'Demo gratis', path: MARKETING_TRIAL_PATH },
]

export const MARKETING_PUBLIC_PATHS = new Set<string>([
  MARKETING_HOME_PATH,
  MARKETING_PRODUCT_PATH,
  MARKETING_FEATURES_PATH,
  MARKETING_PRICING_PATH,
  MARKETING_SUPPORT_PATH,
  MARKETING_TRIAL_PATH,
])

export function isMarketingPublicPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return MARKETING_PUBLIC_PATHS.has(normalized)
}
