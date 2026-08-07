import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'

export function filterPruebasSolicitud(
  items: PruebaSolicitudListItem[],
  query: string,
): PruebaSolicitudListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.solicitudCode.toLowerCase().includes(q) ||
      item.solicitudTitle.toLowerCase().includes(q) ||
      item.companyName?.toLowerCase().includes(q),
  )
}

export type PruebaSolicitudSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: PruebaSolicitudListItem) => boolean
}

export const pruebaSolicitudSegments: PruebaSolicitudSegment[] = [
  {
    id: 'pendiente-cliente',
    name: 'Pendiente cliente',
    description: 'Casos documentados sin aprobación completa del cliente.',
    accentClass: 'border-s-amber-500',
    matches: (item) => item.caseCount > 0 && item.clientOkCount < item.caseCount,
  },
  {
    id: 'aprobados',
    name: 'Aprobados',
    description: 'Todos los casos con OK del cliente.',
    accentClass: 'border-s-emerald-500',
    matches: (item) => item.caseCount > 0 && item.clientOkCount === item.caseCount,
  },
  {
    id: 'sin-casos',
    name: 'Sin casos',
    description: 'Pruebas creadas sin casos documentados aún.',
    accentClass: 'border-s-muted-foreground',
    matches: (item) => item.caseCount === 0,
  },
  {
    id: 'parcial',
    name: 'Avance parcial',
    description: 'Al menos un caso aprobado, pero no todos.',
    accentClass: 'border-s-primary',
    matches: (item) =>
      item.caseCount > 0 &&
      item.clientOkCount > 0 &&
      item.clientOkCount < item.caseCount,
  },
]

export function countPruebaSegmentMatches(
  items: PruebaSolicitudListItem[],
  segment: PruebaSolicitudSegment,
): number {
  return items.filter(segment.matches).length
}
