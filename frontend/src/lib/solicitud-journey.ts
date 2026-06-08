import type { SolicitudStatus } from '@/data/solicitudes.mock'

/** Flujo principal de la solicitud */
export const SOLICITUD_JOURNEY_MAIN_LINE = [
  'Nuevo',
  'Planificación',
  'En Proceso',
  'Entregado a Cliente',
  'Cerrado',
] as const

/** Estados fuera de la ruta principal */
export const SOLICITUD_JOURNEY_STOPPERS = [
  'Detenido por cliente',
  'Detenido Internamente',
  'En espera de Cliente',
] as const

export type SolicitudJourneyMainStage = (typeof SOLICITUD_JOURNEY_MAIN_LINE)[number]
export type SolicitudJourneyStopperStage = (typeof SOLICITUD_JOURNEY_STOPPERS)[number]
export type SolicitudJourneyStage = SolicitudStatus

export const SOLICITUD_JOURNEY_STAGE_OPTIONS: SolicitudJourneyStage[] = [
  ...SOLICITUD_JOURNEY_MAIN_LINE,
  ...SOLICITUD_JOURNEY_STOPPERS,
]

export type SolicitudStatusHistoryEntry = {
  id: string
  status: SolicitudJourneyStage
  at: string
  note?: string
  pausedFromMain?: SolicitudJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: SolicitudStatusHistoryEntry[]
}

export function isStopperStage(
  stage: SolicitudJourneyStage,
): stage is SolicitudJourneyStopperStage {
  return (SOLICITUD_JOURNEY_STOPPERS as readonly string[]).includes(stage)
}

export function isMainLineStage(
  stage: SolicitudJourneyStage,
): stage is SolicitudJourneyMainStage {
  return (SOLICITUD_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

const TRANSITIONS: Record<SolicitudJourneyStage, SolicitudJourneyStage[]> = {
  Nuevo: ['Planificación'],
  Planificación: [
    'En Proceso',
    'Detenido por cliente',
    'Detenido Internamente',
    'En espera de Cliente',
  ],
  'En Proceso': [
    'Entregado a Cliente',
    'Detenido por cliente',
    'Detenido Internamente',
    'En espera de Cliente',
  ],
  'Detenido por cliente': [],
  'Detenido Internamente': [],
  'En espera de Cliente': [],
  'Entregado a Cliente': ['Cerrado'],
  Cerrado: [],
}

export const SOLICITUD_STOPPER_ENTRY_MAIN_STAGES: SolicitudJourneyMainStage[] = [
  'Planificación',
  'En Proceso',
]

export function getPreviousMainStage(
  stage: SolicitudJourneyMainStage,
): SolicitudJourneyMainStage | null {
  const index = SOLICITUD_JOURNEY_MAIN_LINE.indexOf(stage)
  if (index <= 0) return null
  return SOLICITUD_JOURNEY_MAIN_LINE[index - 1]!
}

export function inferPausedFromMainStage(
  current: SolicitudJourneyStage,
  history?: SolicitudStatusHistoryEntry[],
): SolicitudJourneyMainStage {
  if (isMainLineStage(current)) return current

  const hist = history ?? []
  const stopperEntry = [...hist].reverse().find((e) => e.status === current)
  if (stopperEntry?.pausedFromMain) return stopperEntry.pausedFromMain

  const stopperIdx = hist.findIndex((e) => e.status === current)
  if (stopperIdx > 0) {
    for (let i = stopperIdx - 1; i >= 0; i--) {
      const entry = hist[i]!
      if (isMainLineStage(entry.status)) return entry.status
    }
  }

  const mainStages = hist.map((e) => e.status).filter(isMainLineStage)
  if (mainStages.length > 0) return mainStages[mainStages.length - 1]!

  return 'Planificación'
}

export function getAllowedTransitions(
  from: SolicitudJourneyStage,
  ctx?: JourneyTransitionContext,
): SolicitudJourneyStage[] {
  if (isStopperStage(from)) {
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
  from: SolicitudJourneyStage,
  ctx?: JourneyTransitionContext,
): SolicitudJourneyMainStage[] {
  return getAllowedTransitions(from, ctx).filter(isMainLineStage)
}

export function getStopperTransitions(
  from: SolicitudJourneyStage,
): SolicitudJourneyStopperStage[] {
  return (TRANSITIONS[from] ?? []).filter(isStopperStage)
}

export function canTransition(
  from: SolicitudJourneyStage,
  to: SolicitudJourneyStage,
  ctx?: JourneyTransitionContext,
): boolean {
  return getAllowedTransitions(from, ctx).includes(to)
}

export function getResumeMainStage(
  current: SolicitudJourneyStage,
  history?: SolicitudStatusHistoryEntry[],
): SolicitudJourneyMainStage {
  return inferPausedFromMainStage(current, history)
}

export type SolicitudJourneyLane = 'activos' | 'detenidos' | 'cierre'

export function solicitudJourneyLane(stage: SolicitudJourneyStage): SolicitudJourneyLane {
  if (isStopperStage(stage)) return 'detenidos'
  if (stage === 'Entregado a Cliente' || stage === 'Cerrado') return 'cierre'
  return 'activos'
}

export function solicitudKanbanColumnFromStatus(
  status: SolicitudJourneyStage,
): SolicitudJourneyLane {
  return solicitudJourneyLane(status)
}

function formatHistoryDate(): string {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function createSolicitudStatusHistoryEntry(
  status: SolicitudJourneyStage,
  note?: string,
  pausedFromMain?: SolicitudJourneyMainStage,
): SolicitudStatusHistoryEntry {
  return {
    id: `sol-st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status,
    at: formatHistoryDate(),
    note,
    pausedFromMain,
  }
}

export function statusHistoryFor(
  id: string,
  status: SolicitudJourneyStage,
): SolicitudStatusHistoryEntry[] {
  return [
    {
      id: `${id}-st-current`,
      status,
      at: 'Actual',
      note: 'Estado actual',
    },
  ]
}

export function buildSolicitudStatusHistoryOnTransition(
  from: SolicitudJourneyStage,
  to: SolicitudJourneyStage,
  existing?: SolicitudStatusHistoryEntry[],
): SolicitudStatusHistoryEntry[] {
  let history = existing ?? []

  if (
    isMainLineStage(from) &&
    isStopperStage(to) &&
    !history.some((e) => e.status === from)
  ) {
    history = [...history, createSolicitudStatusHistoryEntry(from)]
  }

  if (!history.some((e) => e.status === to)) {
    const entry = createSolicitudStatusHistoryEntry(to, 'Cambio de etapa')
    if (isStopperStage(to) && isMainLineStage(from)) {
      entry.pausedFromMain = from
    }
    history = [...history, entry]
  }

  return history
}
