import type { SolicitudPriority, SolicitudStatus } from '@/data/solicitudes.mock'

export function solicitudStatusVariant(
  status: SolicitudStatus,
): 'proposal' | 'customer' | 'muted' | 'destructive' | 'negotiation' {
  switch (status) {
    case 'Cerrado':
    case 'Entregado a Cliente':
      return 'customer'
    case 'Detenido por cliente':
    case 'Detenido Internamente':
      return 'destructive'
    case 'En espera de Cliente':
    case 'Planificación':
      return 'muted'
    case 'En Proceso':
      return 'negotiation'
    case 'Nuevo':
    default:
      return 'proposal'
  }
}

export function solicitudPriorityVariant(
  priority: SolicitudPriority,
): 'destructive' | 'proposal' | 'muted' | 'negotiation' {
  switch (priority) {
    case 'Urgente':
    case 'Alta':
      return 'destructive'
    case 'Media':
      return 'proposal'
    case 'Baja':
    default:
      return 'muted'
  }
}
