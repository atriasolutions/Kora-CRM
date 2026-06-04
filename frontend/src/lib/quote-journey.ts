/** Flujo principal de la cotización */
export const QUOTE_JOURNEY_MAIN_LINE = [
  'Borrador',
  'En revisión interna',
  'Enviada',
  'En negociación',
  'Aceptada',
] as const

/** Estados fuera de la ruta principal */
export const QUOTE_JOURNEY_OFF_ROUTE = [
  'En espera cliente',
  'Rechazada',
  'Vencida',
  'Cancelada',
] as const

export type QuoteJourneyMainStage = (typeof QUOTE_JOURNEY_MAIN_LINE)[number]
export type QuoteJourneyOffRouteStage = (typeof QUOTE_JOURNEY_OFF_ROUTE)[number]
export type QuoteJourneyStage = QuoteJourneyMainStage | QuoteJourneyOffRouteStage

/** Alias histórico del listado */
export type QuoteStatus = QuoteJourneyStage

export const QUOTE_JOURNEY_STAGE_OPTIONS: QuoteJourneyStage[] = [
  ...QUOTE_JOURNEY_MAIN_LINE,
  ...QUOTE_JOURNEY_OFF_ROUTE,
]

export type QuoteJourneyHistoryEntry = {
  id: string
  stage: QuoteJourneyStage
  enteredAt: string
  note?: string
  pausedFromMain?: QuoteJourneyMainStage
}

/** Historial en detalle de cotización (campo `status` = etapa de ruta) */
export type QuoteStatusHistoryEntry = {
  id: string
  status: QuoteJourneyStage
  at: string
  note?: string
  pausedFromMain?: QuoteJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: QuoteJourneyHistoryEntry[] | QuoteStatusHistoryEntry[]
}

function toJourneyHistory(
  history?: QuoteJourneyHistoryEntry[] | QuoteStatusHistoryEntry[],
): QuoteJourneyHistoryEntry[] | undefined {
  if (!history) return undefined
  return history.map((e) =>
    'stage' in e
      ? (e as QuoteJourneyHistoryEntry)
      : {
          id: e.id,
          stage: e.status as QuoteJourneyStage,
          enteredAt: e.at,
          note: e.note,
          pausedFromMain: e.pausedFromMain,
        },
  )
}

export function isOffRouteStage(stage: QuoteJourneyStage): stage is QuoteJourneyOffRouteStage {
  return (QUOTE_JOURNEY_OFF_ROUTE as readonly string[]).includes(stage)
}

export function isMainLineStage(stage: QuoteJourneyStage): stage is QuoteJourneyMainStage {
  return (QUOTE_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

const TRANSITIONS: Record<QuoteJourneyStage, QuoteJourneyStage[]> = {
  Borrador: ['En revisión interna'],
  'En revisión interna': [
    'Enviada',
    'En espera cliente',
    'Rechazada',
    'Cancelada',
  ],
  Enviada: [
    'En negociación',
    'En espera cliente',
    'Rechazada',
    'Vencida',
    'Cancelada',
  ],
  'En negociación': [
    'Aceptada',
    'En espera cliente',
    'Rechazada',
    'Vencida',
    'Cancelada',
  ],
  Aceptada: [],
  'En espera cliente': [],
  Rechazada: [],
  Vencida: [],
  Cancelada: [],
}

export const QUOTE_OFF_ROUTE_ENTRY_MAIN_STAGES: QuoteJourneyMainStage[] = [
  'En revisión interna',
  'Enviada',
  'En negociación',
]

export function getPreviousMainStage(
  stage: QuoteJourneyMainStage,
): QuoteJourneyMainStage | null {
  const index = QUOTE_JOURNEY_MAIN_LINE.indexOf(stage)
  if (index <= 0) return null
  return QUOTE_JOURNEY_MAIN_LINE[index - 1]!
}

export function inferPausedFromMainStage(
  current: QuoteJourneyStage,
  history?: QuoteJourneyHistoryEntry[] | QuoteStatusHistoryEntry[],
): QuoteJourneyMainStage {
  if (isMainLineStage(current)) return current

  const hist = toJourneyHistory(history) ?? []
  const stopperEntry = [...hist].reverse().find((e) => e.stage === current)
  if (stopperEntry?.pausedFromMain) return stopperEntry.pausedFromMain

  const stopperIdx = hist.findIndex((e) => e.stage === current)
  if (stopperIdx > 0) {
    for (let i = stopperIdx - 1; i >= 0; i--) {
      const entry = hist[i]!
      if (isMainLineStage(entry.stage)) return entry.stage
    }
  }

  const mainStages = hist.map((e) => e.stage).filter(isMainLineStage)
  if (mainStages.length > 0) return mainStages[mainStages.length - 1]!

  return 'Enviada'
}

export function getAllowedTransitions(
  from: QuoteJourneyStage,
  ctx?: JourneyTransitionContext,
): QuoteJourneyStage[] {
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
  from: QuoteJourneyStage,
  ctx?: JourneyTransitionContext,
): QuoteJourneyMainStage[] {
  return getAllowedTransitions(from, ctx).filter(isMainLineStage)
}

export function getOffRouteTransitions(from: QuoteJourneyStage): QuoteJourneyOffRouteStage[] {
  return (TRANSITIONS[from] ?? []).filter(isOffRouteStage)
}

export function canTransition(
  from: QuoteJourneyStage,
  to: QuoteJourneyStage,
  ctx?: JourneyTransitionContext,
): boolean {
  return getAllowedTransitions(from, ctx).includes(to)
}

export function getResumeMainStage(
  current: QuoteJourneyStage,
  history?: QuoteJourneyHistoryEntry[] | QuoteStatusHistoryEntry[],
): QuoteJourneyMainStage {
  return inferPausedFromMainStage(current, history)
}

/** Columna kanban para etapas fuera de ruta */
export function quoteKanbanColumn(stage: QuoteJourneyStage): QuoteJourneyMainStage {
  if (isMainLineStage(stage)) return stage
  if (stage === 'En espera cliente') return 'En negociación'
  if (stage === 'Rechazada' || stage === 'Cancelada') return 'En negociación'
  if (stage === 'Vencida') return 'Enviada'
  return 'Borrador'
}

export function quoteStageVariant(
  stage: QuoteJourneyStage,
): 'proposal' | 'customer' | 'muted' | 'destructive' | 'secondary' | 'negotiation' {
  if (stage === 'Aceptada') return 'customer'
  if (stage === 'Rechazada' || stage === 'Cancelada') return 'destructive'
  if (stage === 'Vencida') return 'secondary'
  if (stage === 'En espera cliente') return 'negotiation'
  if (stage === 'Borrador') return 'muted'
  if (stage === 'En revisión interna') return 'secondary'
  return 'proposal'
}

export function loadQuoteJourneyOverride(_quoteId: string): QuoteJourneyStage | undefined {
  return undefined
}

export function saveQuoteJourneyOverride(_quoteId: string, _stage: QuoteJourneyStage) {
  /* sin persistencia local */
}

export function resolveQuoteJourneyStage(
  quoteId: string,
  seedStage: QuoteJourneyStage,
): QuoteJourneyStage {
  return loadQuoteJourneyOverride(quoteId) ?? seedStage
}

export function createQuoteJourneyHistoryEntry(
  stage: QuoteJourneyStage,
  note?: string,
  pausedFromMain?: QuoteJourneyMainStage,
): QuoteJourneyHistoryEntry {
  const now = new Date()
  return {
    id: `qt-journey-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stage,
    enteredAt: now.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    note,
    pausedFromMain,
  }
}

export function buildQuoteJourneyHistoryOnTransition(
  from: QuoteJourneyStage,
  to: QuoteJourneyStage,
  existing?: QuoteStatusHistoryEntry[],
): QuoteStatusHistoryEntry[] {
  let history = existing ?? []

  if (
    isMainLineStage(from) &&
    isOffRouteStage(to) &&
    !history.some((e) => e.status === from)
  ) {
    history = [
      ...history,
      {
        id: `qt-st-${Date.now()}-from`,
        status: from,
        at: new Date().toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      },
    ]
  }

  if (!history.some((e) => e.status === to)) {
    const entry: QuoteStatusHistoryEntry = {
      id: `qt-st-${Date.now()}`,
      status: to,
      at: new Date().toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      note: 'Cambio de etapa',
    }
    if (isOffRouteStage(to) && isMainLineStage(from)) {
      entry.pausedFromMain = from
    }
    history = [...history, entry]
  }

  return history
}

/** Migra estados legados del seed a la ruta ampliada */
export function legacyStatusToQuoteJourney(status: string): QuoteJourneyStage {
  switch (status) {
    case 'Borrador':
      return 'Borrador'
    case 'Enviada':
      return 'Enviada'
    case 'Aceptada':
      return 'Aceptada'
    case 'Rechazada':
      return 'Rechazada'
    case 'Vencida':
      return 'Vencida'
    case 'En revisión interna':
    case 'En negociación':
    case 'En espera cliente':
    case 'Cancelada':
      return status as QuoteJourneyStage
    default:
      return 'Borrador'
  }
}
