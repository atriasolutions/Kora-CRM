import type { SolicitudListItem, SolicitudStatus } from '@/data/solicitudes.mock'
import { solicitudKanbanColumnFromStatus } from '@/lib/solicitud-journey'

export type SolicitudKanbanColumnId = 'activos' | 'detenidos' | 'cierre'

export const SOLICITUD_KANBAN_COLUMNS: {
  id: SolicitudKanbanColumnId
  title: string
  description: string
}[] = [
  {
    id: 'activos',
    title: 'Activos',
    description: 'Nuevo, planificación y en proceso',
  },
  {
    id: 'detenidos',
    title: 'Detenidos',
    description: 'Stoppers y en espera de cliente',
  },
  {
    id: 'cierre',
    title: 'Cierre',
    description: 'Entregado a cliente y cerrado',
  },
]

const ACTIVOS: SolicitudStatus[] = ['Nuevo', 'Planificación', 'En Proceso']
const DETENIDOS: SolicitudStatus[] = [
  'Detenido por cliente',
  'Detenido Internamente',
  'En espera de Cliente',
]
const CIERRE: SolicitudStatus[] = ['Entregado a Cliente', 'Cerrado']

export function solicitudKanbanColumn(status: SolicitudStatus): SolicitudKanbanColumnId {
  return solicitudKanbanColumnFromStatus(status)
}

export function getSolicitudesBoardDataset(): SolicitudListItem[] {
  return []
}

export function filterSolicitudes(
  items: SolicitudListItem[],
  query: string,
): SolicitudListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.assignee.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
  )
}

export type SolicitudSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: SolicitudListItem) => boolean
}

export const solicitudSegments: SolicitudSegment[] = [
  {
    id: 'urgent',
    name: 'Urgentes',
    description: 'Prioridad urgente y aún abiertas.',
    accentClass: 'border-s-destructive',
    matches: (item) => item.priority === 'Urgente' && item.status !== 'Cerrado',
  },
  {
    id: 'high-priority',
    name: 'Alta prioridad',
    description: 'Prioridad alta en curso.',
    accentClass: 'border-s-amber-500',
    matches: (item) => item.priority === 'Alta' && item.status !== 'Cerrado',
  },
  {
    id: 'new',
    name: 'Nuevas',
    description: 'Solicitudes recién registradas.',
    accentClass: 'border-s-primary',
    matches: (item) => item.status === 'Nuevo',
  },
  {
    id: 'stopped',
    name: 'Detenidas',
    description: 'Bloqueadas por cliente o internamente.',
    accentClass: 'border-s-orange-500',
    matches: (item) => DETENIDOS.includes(item.status),
  },
  {
    id: 'unassigned',
    name: 'Sin responsable',
    description: 'Sin responsable asignado.',
    accentClass: 'border-s-violet-500',
    matches: (item) => !item.assignee?.trim() || item.assignee.trim() === '—',
  },
  {
    id: 'delivered',
    name: 'Entregadas',
    description: 'Entregadas al cliente.',
    accentClass: 'border-s-emerald-500',
    matches: (item) => item.status === 'Entregado a Cliente',
  },
  {
    id: 'closed',
    name: 'Cerradas',
    description: 'Solicitudes finalizadas.',
    accentClass: 'border-s-muted-foreground',
    matches: (item) => item.status === 'Cerrado',
  },
]

export function countSegmentMatches(
  items: SolicitudListItem[],
  segment: SolicitudSegment,
): number {
  return items.filter(segment.matches).length
}
