import type { AccessProfile } from '../types/access-profile.js'
import type { SearchEntityType } from '../types/search.js'
import { canModulePermission } from './permissions.js'
import type { MenuModuleId } from './menu-modules.js'

export const SEARCH_ENTITY_MODULE_MAP: Record<SearchEntityType, MenuModuleId> = {
  contact: 'contactos',
  company: 'empresas',
  opportunity: 'oportunidades',
  quote: 'cotizaciones',
  invoice: 'facturacion',
  boleta: 'boletas',
  gasto: 'gastos',
  activity: 'actividades',
  project: 'proyectos',
  product: 'productos',
  purchase: 'compras',
}

export function canSearchEntityType(
  profile: AccessProfile | null | undefined,
  type: SearchEntityType,
): boolean {
  const moduleId = SEARCH_ENTITY_MODULE_MAP[type]
  return canModulePermission(profile, moduleId, 'view')
}

export function allowedSearchEntityTypes(
  profile: AccessProfile | null | undefined,
): SearchEntityType[] {
  return (Object.keys(SEARCH_ENTITY_MODULE_MAP) as SearchEntityType[]).filter((type) =>
    canSearchEntityType(profile, type),
  )
}
