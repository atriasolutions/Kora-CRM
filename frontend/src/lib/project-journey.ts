import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'

/** Etapas de la ruta del éxito del proyecto */
export const PROJECT_JOURNEY_MAIN_LINE = [
  'Nuevo',
  'En Levantamiento',
  'En Proceso',
  'Entregado a Cliente',
  'Cerrado',
] as const

export const PROJECT_JOURNEY_STOPPERS = [
  'Detenido por Cliente',
  'Detenido internamente',
  'En Espera Cliente',
] as const

export type ProjectJourneyMainStage = (typeof PROJECT_JOURNEY_MAIN_LINE)[number]
export type ProjectJourneyStopperStage = (typeof PROJECT_JOURNEY_STOPPERS)[number]
export type ProjectJourneyStage = ProjectJourneyMainStage | ProjectJourneyStopperStage

export const PROJECT_JOURNEY_STAGE_OPTIONS: ProjectJourneyStage[] = [
  ...PROJECT_JOURNEY_MAIN_LINE,
  ...PROJECT_JOURNEY_STOPPERS,
]

export type ProjectJourneyHistoryEntry = {
  id: string
  stage: ProjectJourneyStage
  enteredAt: string
  note?: string
  /** Etapa de la ruta principal desde la que se activó la detención */
  pausedFromMain?: ProjectJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: ProjectJourneyHistoryEntry[]
}

const JOURNEY_KEY = `${STORAGE_PREFIX}-crm-project-journey`

export function isStopperStage(stage: ProjectJourneyStage): stage is ProjectJourneyStopperStage {
  return (PROJECT_JOURNEY_STOPPERS as readonly string[]).includes(stage)
}

export function isMainLineStage(stage: ProjectJourneyStage): stage is ProjectJourneyMainStage {
  return (PROJECT_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

/** Transiciones permitidas desde cada etapa */
const TRANSITIONS: Record<ProjectJourneyStage, ProjectJourneyStage[]> = {
  Nuevo: ['En Levantamiento'],
  'En Levantamiento': [
    'En Proceso',
    'Detenido por Cliente',
    'Detenido internamente',
    'En Espera Cliente',
  ],
  'En Proceso': [
    'Entregado a Cliente',
    'Detenido por Cliente',
    'Detenido internamente',
    'En Espera Cliente',
  ],
  'Detenido por Cliente': [],
  'Detenido internamente': [],
  'En Espera Cliente': [],
  'Entregado a Cliente': ['Cerrado'],
  Cerrado: [],
}

export function getPreviousMainStage(
  stage: ProjectJourneyMainStage,
): ProjectJourneyMainStage | null {
  const index = PROJECT_JOURNEY_MAIN_LINE.indexOf(stage)
  if (index <= 0) return null
  return PROJECT_JOURNEY_MAIN_LINE[index - 1]!
}

export function getAllowedTransitions(
  from: ProjectJourneyStage,
  ctx?: JourneyTransitionContext,
): ProjectJourneyStage[] {
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
  from: ProjectJourneyStage,
  ctx?: JourneyTransitionContext,
): ProjectJourneyMainStage[] {
  return getAllowedTransitions(from, ctx).filter(isMainLineStage)
}

export function getStopperTransitions(from: ProjectJourneyStage): ProjectJourneyStopperStage[] {
  return (TRANSITIONS[from] ?? []).filter(isStopperStage)
}

/** Etapas de la línea principal desde las que se puede entrar a una detención */
export const STOPPER_ENTRY_MAIN_STAGES: ProjectJourneyMainStage[] = [
  'En Levantamiento',
  'En Proceso',
]

export function canEnterStopper(from: ProjectJourneyStage): boolean {
  return getStopperTransitions(from).length > 0
}

/**
 * Si el proyecto está en detención, infiere la última etapa de la ruta principal
 * (p. ej. Levantamiento o En Proceso) antes de salir de la línea.
 */
export function inferPausedFromMainStage(
  current: ProjectJourneyStage,
  history?: ProjectJourneyHistoryEntry[],
): ProjectJourneyMainStage {
  if (isMainLineStage(current)) return current

  const hist = history ?? []

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

  return 'En Levantamiento'
}

export function getResumeMainStage(
  current: ProjectJourneyStage,
  history?: ProjectJourneyHistoryEntry[],
): ProjectJourneyMainStage {
  return inferPausedFromMainStage(current, history)
}

export function canTransition(
  from: ProjectJourneyStage,
  to: ProjectJourneyStage,
  ctx?: JourneyTransitionContext,
): boolean {
  return getAllowedTransitions(from, ctx).includes(to)
}

/** Agrupación para kanban / filtros rápidos */
export type ProjectJourneyLane = 'activos' | 'detenidos' | 'cierre'

export function journeyLane(stage: ProjectJourneyStage): ProjectJourneyLane {
  if (isStopperStage(stage)) return 'detenidos'
  if (stage === 'Entregado a Cliente' || stage === 'Cerrado') return 'cierre'
  return 'activos'
}

export const PROJECT_JOURNEY_LANE_LABELS: Record<ProjectJourneyLane, string> = {
  activos: 'Activos',
  detenidos: 'Detenidos',
  cierre: 'Cierre',
}

export function journeyStageVariant(
  stage: ProjectJourneyStage,
): 'proposal' | 'customer' | 'muted' | 'destructive' | 'secondary' {
  if (stage === 'Cerrado' || stage === 'Entregado a Cliente') return 'customer'
  if (isStopperStage(stage)) return 'destructive'
  if (stage === 'Nuevo') return 'secondary'
  return 'proposal'
}

export function loadJourneyOverride(projectId: string): ProjectJourneyStage | undefined {
  if (!isLocalDetailStorageActive()) return undefined
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return undefined
    const map = JSON.parse(raw) as Record<string, ProjectJourneyStage>
    return map[projectId]
  } catch {
    return undefined
  }
}

export function saveJourneyOverride(projectId: string, stage: ProjectJourneyStage) {
  if (!isLocalDetailStorageActive()) return
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, ProjectJourneyStage>) : {}
    map[projectId] = stage
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function resolveJourneyStage(
  projectId: string,
  seedStage: ProjectJourneyStage,
): ProjectJourneyStage {
  if (!isLocalDetailStorageActive()) return seedStage
  return loadJourneyOverride(projectId) ?? seedStage
}

export function createJourneyHistoryEntry(
  stage: ProjectJourneyStage,
  note?: string,
): ProjectJourneyHistoryEntry {
  const now = new Date()
  const enteredAt = now.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return {
    id: `journey-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stage,
    enteredAt,
    note,
  }
}

export function buildJourneyHistory(
  current: ProjectJourneyStage,
  existing?: ProjectJourneyHistoryEntry[],
): ProjectJourneyHistoryEntry[] {
  if (existing?.some((e) => e.stage === current)) return existing
  return [...(existing ?? []), createJourneyHistoryEntry(current)]
}

/** Al cambiar de etapa, conserva la etapa de origen (p. ej. antes de una detención). */
export function buildJourneyHistoryOnTransition(
  from: ProjectJourneyStage,
  to: ProjectJourneyStage,
  existing?: ProjectJourneyHistoryEntry[],
): ProjectJourneyHistoryEntry[] {
  let history = existing ?? []

  if (
    isMainLineStage(from) &&
    isStopperStage(to) &&
    !history.some((e) => e.stage === from)
  ) {
    history = [...history, createJourneyHistoryEntry(from)]
  }

  if (!history.some((e) => e.stage === to)) {
    const entry = createJourneyHistoryEntry(to)
    if (isStopperStage(to) && isMainLineStage(from)) {
      entry.pausedFromMain = from
    }
    history = [...history, entry]
  }

  return history
}

/** Migra status legado del listado a etapa de ruta */
export function journeyToListStatus(
  stage: ProjectJourneyStage,
): 'En curso' | 'Completado' | 'Pausado' {
  if (stage === 'Cerrado' || stage === 'Entregado a Cliente') return 'Completado'
  if (isStopperStage(stage)) return 'Pausado'
  return 'En curso'
}

export function legacyStatusToJourney(
  status: 'En curso' | 'Completado' | 'Pausado',
  progressNum: number,
): ProjectJourneyStage {
  if (status === 'Completado') return progressNum >= 100 ? 'Cerrado' : 'Entregado a Cliente'
  if (status === 'Pausado') return 'Detenido por Cliente'
  if (progressNum < 15) return 'Nuevo'
  if (progressNum < 40) return 'En Levantamiento'
  return 'En Proceso'
}
