import type { ProjectListItem, ProjectStatus } from '@/data/projects.mock'

export const PROJECT_KANBAN_COLUMNS: {
  status: ProjectStatus
  title: string
  description: string
}[] = [
  {
    status: 'En curso',
    title: 'Activos',
    description: 'Nuevo, levantamiento y en proceso',
  },
  {
    status: 'Pausado',
    title: 'Detenidos',
    description: 'Stoppers (cliente, interno, en espera)',
  },
  {
    status: 'Completado',
    title: 'Cierre',
    description: 'Entregado a cliente y cerrado',
  },
]

export function getProjectsBoardDataset(): ProjectListItem[] {
  return []
}

export function filterProjects(
  items: ProjectListItem[],
  query: string,
  matches?: (item: ProjectListItem) => boolean,
): ProjectListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.manager.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type ProjectSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: ProjectListItem) => boolean
}

export const projectSegments: ProjectSegment[] = [
  {
    id: 'active',
    name: 'En curso',
    description: 'Proyectos con entrega activa.',
    accentClass: 'border-s-primary',
    matches: (p) => p.status === 'En curso',
  },
  {
    id: 'risk',
    name: 'En riesgo o retraso',
    description: 'Salud del proyecto comprometida.',
    accentClass: 'border-s-amber-500',
    matches: (p) => p.health === 'En riesgo' || p.health === 'Retrasado',
  },
  {
    id: 'high-progress',
    name: 'Avance > 70%',
    description: 'Cerca del cierre.',
    accentClass: 'border-s-emerald-500',
    matches: (p) => p.progressNum >= 70 && p.status !== 'Completado',
  },
  {
    id: 'done',
    name: 'Completados',
    description: 'Proyectos entregados.',
    accentClass: 'border-s-violet-500',
    matches: (p) => p.status === 'Completado',
  },
]

export function countSegmentMatches(
  items: ProjectListItem[],
  segment: ProjectSegment,
): number {
  return items.filter(segment.matches).length
}
