import type { OpportunityListItem } from '@/data/opportunities.mock'

import { OPPORTUNITY_JOURNEY_MAIN_LINE } from '@/lib/opportunity-journey'

export const OPPORTUNITY_KANBAN_COLUMNS: {
  stage: (typeof OPPORTUNITY_JOURNEY_MAIN_LINE)[number]
  description: string
}[] = [
  { stage: 'Calificados', description: 'Calificación inicial' },
  { stage: 'En diagnóstico', description: 'Descubrimiento y necesidades' },
  { stage: 'Propuesta', description: 'Propuesta comercial' },
  { stage: 'Negociación', description: 'Términos y cierre' },
  { stage: 'Cerrada', description: 'Ganada' },
]

export function getOpportunitiesBoardDataset(): OpportunityListItem[] {
  return []
}

export function filterOpportunities(
  companies: OpportunityListItem[],
  query: string,
  matches?: (opp: OpportunityListItem) => boolean,
): OpportunityListItem[] {
  let rows = companies
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.company.toLowerCase().includes(q) ||
        o.contactName.toLowerCase().includes(q) ||
        o.owner.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type OpportunitySegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (opp: OpportunityListItem) => boolean
}

export const opportunitySegments: OpportunitySegment[] = [
  {
    id: 'commit',
    name: 'Comprometidos este mes',
    description: 'Forecast commit con cierre en los próximos 30 días.',
    accentClass: 'border-s-emerald-500',
    matches: (o) => o.forecast === 'Comprometido' && o.outcome === 'Abierta',
  },
  {
    id: 'high-priority',
    name: 'Prioridad alta',
    description: 'Oportunidades que requieren seguimiento inmediato.',
    accentClass: 'border-s-orange-500',
    matches: (o) => o.priority === 'Alta' && o.outcome === 'Abierta',
  },
  {
    id: 'stale',
    name: 'Sin actividad reciente',
    description: 'Sin interacción en los últimos días.',
    accentClass: 'border-s-amber-500',
    matches: (o) => {
      const v = o.lastActivity.toLowerCase()
      return (
        o.outcome === 'Abierta' &&
        !v.includes('hoy') &&
        !v.includes('ayer') &&
        !v.includes('recién')
      )
    },
  },
  {
    id: 'won',
    name: 'Ganadas',
    description: 'Oportunidades cerradas con éxito.',
    accentClass: 'border-s-violet-500',
    matches: (o) => o.outcome === 'Ganada',
  },
]

export function countSegmentMatches(
  opportunities: OpportunityListItem[],
  segment: OpportunitySegment,
): number {
  return opportunities.filter(segment.matches).length
}
