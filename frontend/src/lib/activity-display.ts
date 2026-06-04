import type {
  ActivityListItem,
  ActivityRelatedType,
  ActivityStatus,
} from '@/data/activities.mock'

export function activityStatusVariant(
  status: ActivityStatus,
): 'proposal' | 'customer' | 'destructive' | 'negotiation' {
  switch (status) {
    case 'Completada':
      return 'customer'
    case 'Vencida':
      return 'destructive'
    case 'En curso':
      return 'negotiation'
    case 'Pendiente':
    default:
      return 'proposal'
  }
}

export function activityPriorityVariant(
  priority: ActivityListItem['priority'],
): 'destructive' | 'proposal' | 'muted' {
  switch (priority) {
    case 'Alta':
      return 'destructive'
    case 'Media':
      return 'proposal'
    case 'Baja':
    default:
      return 'muted'
  }
}

export function activityRelatedLabel(type: ActivityRelatedType): string {
  switch (type) {
    case 'contacto':
      return 'Contacto'
    case 'empresa':
      return 'Empresa'
    case 'oportunidad':
      return 'Oportunidad'
    case 'cotizacion':
      return 'Cotización'
    case 'compra':
      return 'Compra'
    case 'factura':
      return 'Factura'
    case 'proyecto':
      return 'Proyecto'
    case 'ingreso':
      return 'Ingreso'
    case 'producto':
      return 'Producto'
    case 'inventario':
      return 'Inventario'
  }
}

export function activityDetailPath(recordId: string | undefined): string | null {
  const id = recordId?.trim()
  if (!id) return null
  return `/actividades/${id}`
}

export function activityRelatedPath(
  relatedType: ActivityRelatedType,
  relatedId: string,
): string {
  switch (relatedType) {
    case 'contacto':
      return `/contactos/${relatedId}`
    case 'empresa':
      return `/empresas/${relatedId}`
    case 'oportunidad':
      return `/oportunidades/${relatedId}`
    case 'cotizacion':
      return `/cotizaciones/${relatedId}`
    case 'compra':
      return `/compras/${relatedId}`
    case 'factura':
      return `/facturacion/${relatedId}`
    case 'proyecto':
      return `/proyectos/${relatedId}`
    case 'ingreso':
      return `/ingresos/${relatedId}`
    case 'producto':
      return `/productos/${relatedId}`
    case 'inventario':
      return `/inventario/${relatedId}`
  }
}
