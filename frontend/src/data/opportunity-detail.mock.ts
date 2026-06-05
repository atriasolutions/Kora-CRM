import { getRegistryOpportunityById } from '@/data/opportunities-registry-store'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { opportunityListSeed } from '@/data/opportunities.mock'
import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import type { OpportunityFile } from '@/lib/opportunity-files'
import { buildOpportunityActivitiesForDetail } from '@/lib/opportunity-activities'
import type { OpportunityQuoteSummary } from '@/lib/quote-relations'
import { quoteSummariesForOpportunity } from '@/lib/quote-relations'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import {
  isMainLineStage,
  isOffRouteStage,
  journeyStageToOutcome,
  legacyStageToOpportunityJourney,
  resolveOpportunityJourneyStage,
  type OpportunityJourneyMainStage,
  type OpportunityJourneyStage,
  type OpportunityStageHistory,
} from '@/lib/opportunity-journey'

export type { OpportunityStageHistory }

export type OpportunityLineItem = {
  id: string
  product: string
  quantity: number
  unitPrice: string
  discount: string
  total: string
}

export type OpportunityDetail = OpportunityListItem & {
  description: string
  stageEnteredAt: string
  contactEmail: string
  contactPhone: string
  decisionMaker: string
  competitors: string
  lossReason?: string
  budget: string
  buyingProcess: string
  nextStep?: { title: string; when: string }
  tags: string[]
  stageHistory: OpportunityStageHistory[]
  lineItems: OpportunityLineItem[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: OpportunityFile[]
  quotes: OpportunityQuoteSummary[]
  pendingActivities: number
  quoteCount: number
  daysInStage: number
  primaryQuoteId?: string
}

export function resolveOpportunityListItem(
  id: string,
  base?: OpportunityListItem,
): OpportunityListItem {
  const fromRegistry = getRegistryOpportunityById(id)
  if (fromRegistry) return { ...fromRegistry, id }
  if (base) return { ...base, id }

  const direct = opportunityListSeed.find((o) => o.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^oportunidades-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = opportunityListSeed[idx % opportunityListSeed.length]
    return { ...seed!, id }
  }

  throw new Error(`Oportunidad no encontrada: ${id}`)
}

function stageHistoryFor(
  id: string,
  journeyStage: OpportunityJourneyStage,
): OpportunityStageHistory[] {
  const chains: Partial<Record<OpportunityJourneyStage, OpportunityJourneyStage[]>> = {
    Calificados: ['Calificados'],
    'En diagnóstico': ['Calificados', 'En diagnóstico'],
    Propuesta: ['Calificados', 'En diagnóstico', 'Propuesta'],
    Negociación: ['Calificados', 'En diagnóstico', 'Propuesta', 'Negociación'],
    Cerrada: ['Calificados', 'En diagnóstico', 'Propuesta', 'Negociación', 'Cerrada'],
    'En espera cliente': ['Calificados', 'En diagnóstico', 'Propuesta', 'En espera cliente'],
    'Pausada internamente': ['Calificados', 'Propuesta', 'Pausada internamente'],
    Perdida: ['Calificados', 'En diagnóstico', 'Propuesta', 'Perdida'],
    'No calificada': ['Calificados', 'No calificada'],
  }

  const chain = chains[journeyStage] ?? ['Calificados', journeyStage]
  const dates = ['2 abr 2024', '10 abr 2024', '18 abr 2024', '6 may 2024', '14 may 2024']

  return chain.map((stage, i) => {
    const entry: OpportunityStageHistory = {
      id: `${id}-st-${i}`,
      stage,
      enteredAt: dates[i] ?? dates[dates.length - 1]!,
      note: stage === journeyStage ? 'Etapa actual' : undefined,
    }
    const prev = chain[i - 1]
    if (
      stage === journeyStage &&
      isOffRouteStage(journeyStage) &&
      prev &&
      isMainLineStage(prev)
    ) {
      entry.pausedFromMain = prev as OpportunityJourneyMainStage
    }
    return entry
  })
}

function lineItemsFor(opp: OpportunityListItem, id: string): OpportunityLineItem[] {
  return [
    {
      id: `${id}-li-1`,
      product: 'Licencias plataforma',
      quantity: 1,
      unitPrice: opp.amount,
      discount: '0%',
      total: opp.amount,
    },
    {
      id: `${id}-li-2`,
      product: 'Implementación y onboarding',
      quantity: 1,
      unitPrice: '$8,500',
      discount: '10%',
      total: '$7,650',
    },
  ]
}

export function getOpportunityDetail(id: string): OpportunityDetail {
  const base = resolveOpportunityListItem(id)
  const journeyStage = resolveOpportunityJourneyStage(
    id,
    legacyStageToOpportunityJourney(base.stage, base.outcome),
  )
  const outcome = journeyStageToOutcome(journeyStage)
  const oppBase: OpportunityListItem = { ...base, stage: journeyStage, outcome }
  const idx = opportunityListSeed.findIndex((s) => s.id === oppBase.id)
  const quotes = quoteSummariesForOpportunity(oppBase.id)

  const detail: OpportunityDetail = {
    ...oppBase,
    description: `Oportunidad ${oppBase.type.toLowerCase()} con ${oppBase.company}. Enfoque en valor, plazos de implementación y aprobación de presupuesto.`,
    stageEnteredAt: '6 may 2024',
    contactEmail: `${oppBase.contactName.split(' ')[0]?.toLowerCase() ?? 'contacto'}@${oppBase.company.toLowerCase().replace(/\s+/g, '')}.com`,
    contactPhone: '+56 2 2345 6789',
    decisionMaker: oppBase.contactName,
    competitors: idx % 2 === 0 ? 'Competidor A, Competidor B' : 'Sin competidor declarado',
    lossReason: outcome === 'Perdida' ? 'Precio / timing' : undefined,
    budget: oppBase.amount,
    buyingProcess: 'Comité de compras · 2-3 semanas de evaluación',
    nextStep:
      outcome === 'Abierta'
        ? { title: 'Seguimiento post-propuesta', when: 'Mañana, 10:00' }
        : undefined,
    tags: [
      oppBase.priority === 'Alta' ? 'Prioridad alta' : 'Seguimiento estándar',
      oppBase.forecast,
      oppBase.type,
    ],
    stageHistory: stageHistoryFor(id, journeyStage),
    lineItems: lineItemsFor(oppBase, id),
    activities: buildOpportunityActivitiesForDetail(oppBase),
    notes: [
      {
        id: `opp-note-${id}-1`,
        body: '<p>Decisor económico: CFO. Técnico: contacto principal. Ciclo estimado 60-90 días.</p>',
        author: oppBase.owner,
        when: '13 may, 09:30',
      },
    ],
    files: [],
    quotes,
    pendingActivities: (idx % 3) + 1,
    quoteCount: quotes.length,
    daysInStage: (idx % 12) + 3,
    lastActivity: oppBase.lastActivity,
  }

  detail.notes = mergeEntityNotesForMock('oportunidad', id, detail.notes ?? [])
  return detail
}
