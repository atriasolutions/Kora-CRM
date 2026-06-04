type OpportunityOutcome = 'Abierta' | 'Ganada' | 'Perdida'

/** Flujo principal de ventas */
export const OPPORTUNITY_JOURNEY_MAIN_LINE = [
  'Calificados',
  'En diagnóstico',
  'Propuesta',
  'Negociación',
  'Cerrada',
] as const

/** Estados fuera de la ruta principal */
export const OPPORTUNITY_JOURNEY_OFF_ROUTE = [
  'En espera cliente',
  'Pausada internamente',
  'Perdida',
  'No calificada',
] as const

export type OpportunityJourneyMainStage = (typeof OPPORTUNITY_JOURNEY_MAIN_LINE)[number]
export type OpportunityJourneyOffRouteStage = (typeof OPPORTUNITY_JOURNEY_OFF_ROUTE)[number]
export type OpportunityJourneyStage = OpportunityJourneyMainStage | OpportunityJourneyOffRouteStage

/** Alias del campo `stage` en listados */
export type OpportunityStage = OpportunityJourneyStage

export const OPPORTUNITY_JOURNEY_STAGE_OPTIONS: OpportunityJourneyStage[] = [
  ...OPPORTUNITY_JOURNEY_MAIN_LINE,
  ...OPPORTUNITY_JOURNEY_OFF_ROUTE,
]

export type OpportunityStageHistory = {
  id: string
  stage: OpportunityJourneyStage
  enteredAt: string
  note?: string
  pausedFromMain?: OpportunityJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: OpportunityStageHistory[]
}

export function isOffRouteStage(
  stage: OpportunityJourneyStage,
): stage is OpportunityJourneyOffRouteStage {
  return (OPPORTUNITY_JOURNEY_OFF_ROUTE as readonly string[]).includes(stage)
}

export function isMainLineStage(
  stage: OpportunityJourneyStage,
): stage is OpportunityJourneyMainStage {
  return (OPPORTUNITY_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

const TRANSITIONS: Record<OpportunityJourneyStage, OpportunityJourneyStage[]> = {
  Calificados: ['En diagnóstico', 'No calificada'],
  'En diagnóstico': [
    'Propuesta',
    'En espera cliente',
    'Pausada internamente',
    'No calificada',
  ],
  Propuesta: [
    'Negociación',
    'En espera cliente',
    'Pausada internamente',
    'Perdida',
  ],
  Negociación: ['Cerrada', 'En espera cliente', 'Pausada internamente', 'Perdida'],
  Cerrada: [],
  'En espera cliente': [],
  'Pausada internamente': [],
  Perdida: [],
  'No calificada': [],
}

export const OPPORTUNITY_OFF_ROUTE_ENTRY_MAIN_STAGES: OpportunityJourneyMainStage[] = [
  'En diagnóstico',
  'Propuesta',
  'Negociación',
]

export function getPreviousMainStage(
  stage: OpportunityJourneyMainStage,
): OpportunityJourneyMainStage | null {
  const index = OPPORTUNITY_JOURNEY_MAIN_LINE.indexOf(stage)
  if (index <= 0) return null
  return OPPORTUNITY_JOURNEY_MAIN_LINE[index - 1]!
}

export function inferPausedFromMainStage(
  current: OpportunityJourneyStage,
  history?: OpportunityStageHistory[],
): OpportunityJourneyMainStage {
  if (isMainLineStage(current)) return current

  const hist = history ?? []
  const entry = [...hist].reverse().find((e) => e.stage === current)
  if (entry?.pausedFromMain) return entry.pausedFromMain

  const idx = hist.findIndex((e) => e.stage === current)
  if (idx > 0) {
    for (let i = idx - 1; i >= 0; i--) {
      const h = hist[i]!
      if (isMainLineStage(h.stage)) return h.stage
    }
  }

  const mains = hist.map((e) => e.stage).filter(isMainLineStage)
  if (mains.length > 0) return mains[mains.length - 1]!

  return 'Propuesta'
}

export function getAllowedTransitions(
  from: OpportunityJourneyStage,
  ctx?: JourneyTransitionContext,
): OpportunityJourneyStage[] {
  if (isOffRouteStage(from)) {
    return [inferPausedFromMainStage(from, ctx?.history)]
  }

  const allowed = [...(TRANSITIONS[from] ?? [])]

  if (isMainLineStage(from)) {
    const previous = getPreviousMainStage(from)
    if (previous && !allowed.includes(previous)) {
      allowed.unshift(previous)
    }
  }

  return allowed
}

export function getMainLineTransitions(
  from: OpportunityJourneyStage,
  ctx?: JourneyTransitionContext,
): OpportunityJourneyMainStage[] {
  return getAllowedTransitions(from, ctx).filter(isMainLineStage)
}

export function getOffRouteTransitions(
  from: OpportunityJourneyStage,
): OpportunityJourneyOffRouteStage[] {
  return (TRANSITIONS[from] ?? []).filter(isOffRouteStage)
}

export function canTransition(
  from: OpportunityJourneyStage,
  to: OpportunityJourneyStage,
  ctx?: JourneyTransitionContext,
): boolean {
  return getAllowedTransitions(from, ctx).includes(to)
}

export function getResumeMainStage(
  current: OpportunityJourneyStage,
  history?: OpportunityStageHistory[],
): OpportunityJourneyMainStage {
  return inferPausedFromMainStage(current, history)
}

export function journeyStageToOutcome(
  stage: OpportunityJourneyStage,
  _lossReason?: string,
): OpportunityOutcome {
  if (stage === 'Cerrada') return 'Ganada'
  if (stage === 'Perdida' || stage === 'No calificada') return 'Perdida'
  return 'Abierta'
}

export function opportunityStageVariant(
  stage: OpportunityJourneyStage,
): 'qualified' | 'proposal' | 'negotiation' | 'customer' | 'muted' | 'destructive' | 'secondary' {
  if (stage === 'Cerrada') return 'customer'
  if (stage === 'Perdida' || stage === 'No calificada') return 'destructive'
  if (stage === 'En espera cliente') return 'negotiation'
  if (stage === 'Pausada internamente') return 'secondary'
  if (stage === 'Calificados') return 'qualified'
  if (stage === 'En diagnóstico') return 'muted'
  if (stage === 'Propuesta') return 'proposal'
  return 'negotiation'
}

/** Columna kanban para etapas fuera de ruta */
export function opportunityKanbanColumn(
  stage: OpportunityJourneyStage,
): OpportunityJourneyMainStage {
  if (isMainLineStage(stage)) return stage
  if (stage === 'No calificada') return 'Calificados'
  if (stage === 'Perdida') return 'Negociación'
  return 'Propuesta'
}

export function loadOpportunityJourneyOverride(
  _opportunityId: string,
): OpportunityJourneyStage | undefined {
  return undefined
}

export function saveOpportunityJourneyOverride(
  _opportunityId: string,
  _stage: OpportunityJourneyStage,
) {
  /* sin persistencia local */
}

export function resolveOpportunityJourneyStage(
  opportunityId: string,
  seedStage: OpportunityJourneyStage,
): OpportunityJourneyStage {
  return loadOpportunityJourneyOverride(opportunityId) ?? seedStage
}

export function buildOpportunityStageHistoryOnTransition(
  from: OpportunityJourneyStage,
  to: OpportunityJourneyStage,
  existing?: OpportunityStageHistory[],
): OpportunityStageHistory[] {
  let history = existing ?? []
  const dateStr = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (
    isMainLineStage(from) &&
    isOffRouteStage(to) &&
    !history.some((e) => e.stage === from)
  ) {
    history = [
      ...history,
      { id: `opp-st-${Date.now()}-from`, stage: from, enteredAt: dateStr },
    ]
  }

  if (!history.some((e) => e.stage === to)) {
    const entry: OpportunityStageHistory = {
      id: `opp-st-${Date.now()}`,
      stage: to,
      enteredAt: dateStr,
      note: 'Cambio de etapa',
    }
    if (isOffRouteStage(to) && isMainLineStage(from)) {
      entry.pausedFromMain = from
    }
    history = [...history, entry]
  }

  return history
}

export function legacyStageToOpportunityJourney(
  stage: string,
  outcome?: OpportunityOutcome,
): OpportunityJourneyStage {
  if (stage === 'Cerrada' && outcome === 'Perdida') return 'Perdida'
  if (stage === 'Cerrada') return 'Cerrada'
  switch (stage) {
    case 'Calificados':
    case 'En diagnóstico':
    case 'Propuesta':
    case 'Negociación':
    case 'En espera cliente':
    case 'Pausada internamente':
    case 'Perdida':
    case 'No calificada':
      return stage as OpportunityJourneyStage
    default:
      return 'Calificados'
  }
}
