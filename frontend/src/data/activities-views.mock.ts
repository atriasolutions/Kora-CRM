import type { ActivityListItem, ActivityStatus } from '@/data/activities.mock'

export const ACTIVITY_KANBAN_COLUMNS: {
  status: ActivityStatus
  description: string
}[] = [
  { status: 'Pendiente', description: 'Por realizar' },
  { status: 'En curso', description: 'En ejecución' },
  { status: 'Vencida', description: 'Requieren atención' },
  { status: 'Completada', description: 'Finalizadas' },
]

export function getActivitiesBoardDataset(): ActivityListItem[] {
  return []
}

export function filterActivities(
  items: ActivityListItem[],
  query: string,
  matches?: (item: ActivityListItem) => boolean,
): ActivityListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.relatedName.toLowerCase().includes(q) ||
        a.companyName.toLowerCase().includes(q) ||
        a.assignee.toLowerCase().includes(q) ||
        a.typeLabel.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type ActivitySegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: ActivityListItem) => boolean
}

export const activitySegments: ActivitySegment[] = [
  {
    id: 'today',
    name: 'Para hoy',
    description: 'Actividades con vencimiento hoy.',
    accentClass: 'border-s-primary',
    matches: (a) => a.due.toLowerCase().includes('hoy') && a.status === 'Pendiente',
  },
  {
    id: 'high',
    name: 'Prioridad alta',
    description: 'Seguimiento urgente del equipo.',
    accentClass: 'border-s-destructive',
    matches: (a) => a.priority === 'Alta' && a.status !== 'Completada',
  },
  {
    id: 'overdue',
    name: 'Vencidas',
    description: 'Actividades fuera de plazo.',
    accentClass: 'border-s-amber-500',
    matches: (a) => a.status === 'Vencida',
  },
  {
    id: 'done',
    name: 'Completadas',
    description: 'Cerradas recientemente.',
    accentClass: 'border-s-emerald-500',
    matches: (a) => a.status === 'Completada',
  },
]

export function countSegmentMatches(
  items: ActivityListItem[],
  segment: ActivitySegment,
): number {
  return items.filter(segment.matches).length
}
