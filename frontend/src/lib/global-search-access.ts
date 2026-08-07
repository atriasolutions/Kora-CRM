import type { GlobalSearchEntityType, GlobalSearchResult } from '@/types/global-search'
import type { MenuModuleId } from '@/lib/menu-modules'

export const SEARCH_ENTITY_MODULE_MAP: Record<GlobalSearchEntityType, MenuModuleId> = {
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

export function filterGlobalSearchResults(
  results: GlobalSearchResult[],
  canViewModule: (moduleId: MenuModuleId) => boolean,
): GlobalSearchResult[] {
  return results.filter((item) => {
    const moduleId = SEARCH_ENTITY_MODULE_MAP[item.type]
    return canViewModule(moduleId)
  })
}

export function allowedGlobalSearchEntityTypes(
  canViewModule: (moduleId: MenuModuleId) => boolean,
): GlobalSearchEntityType[] {
  return (Object.keys(SEARCH_ENTITY_MODULE_MAP) as GlobalSearchEntityType[]).filter(
    (type) => canViewModule(SEARCH_ENTITY_MODULE_MAP[type]),
  )
}
