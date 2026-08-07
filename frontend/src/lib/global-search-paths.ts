import type { GlobalSearchEntityType } from '@/types/global-search'

export const GLOBAL_SEARCH_TYPE_LABELS: Record<GlobalSearchEntityType, string> = {
  contact: 'Contactos',
  company: 'Empresas',
  opportunity: 'Oportunidades',
  quote: 'Cotizaciones',
  invoice: 'Facturación',
  boleta: 'Boletas',
  gasto: 'Gastos',
  activity: 'Actividades',
  project: 'Proyectos',
  product: 'Productos',
  purchase: 'Compras',
}

export function globalSearchResultPath(
  type: GlobalSearchEntityType,
  id: string,
): string {
  switch (type) {
    case 'contact':
      return `/contactos/${id}`
    case 'company':
      return `/empresas/${id}`
    case 'opportunity':
      return `/oportunidades/${id}`
    case 'quote':
      return `/cotizaciones/${id}`
    case 'invoice':
      return `/facturacion/${id}`
    case 'boleta':
      return `/boletas/${id}`
    case 'gasto':
      return `/gastos/${id}`
    case 'activity':
      return `/actividades/${id}`
    case 'project':
      return `/proyectos/${id}`
    case 'product':
      return `/productos/${id}`
    case 'purchase':
      return `/compras/${id}`
  }
}
