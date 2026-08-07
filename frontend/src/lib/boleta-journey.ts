import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { BoletaStatus } from '@/data/boletas.mock'

export const BOLETA_JOURNEY_MAIN_LINE = ['Borrador', 'Emitida'] as const
export const BOLETA_JOURNEY_OFF_ROUTE = ['Anulada'] as const

export type BoletaJourneyMainStage = (typeof BOLETA_JOURNEY_MAIN_LINE)[number]
export type BoletaJourneyOffRouteStage = (typeof BOLETA_JOURNEY_OFF_ROUTE)[number]
export type BoletaJourneyStage = BoletaJourneyMainStage | BoletaJourneyOffRouteStage

export const BOLETA_JOURNEY_STAGE_OPTIONS: BoletaJourneyStage[] = [
  ...BOLETA_JOURNEY_MAIN_LINE,
  ...BOLETA_JOURNEY_OFF_ROUTE,
]

export type BoletaStatusHistoryEntry = {
  id: string
  status: BoletaJourneyStage
  at: string
  note?: string
  pausedFromMain?: BoletaJourneyMainStage
}

const JOURNEY_KEY = `${STORAGE_PREFIX}-crm-boleta-journey`

const TRANSITIONS: Record<BoletaJourneyStage, BoletaJourneyStage[]> = {
  Borrador: ['Emitida', 'Anulada'],
  Emitida: ['Anulada'],
  Anulada: ['Borrador'],
}

export function isBoletaOffRouteStage(
  stage: BoletaJourneyStage,
): stage is BoletaJourneyOffRouteStage {
  return (BOLETA_JOURNEY_OFF_ROUTE as readonly string[]).includes(stage)
}

export function isBoletaMainLineStage(
  stage: BoletaJourneyStage,
): stage is BoletaJourneyMainStage {
  return (BOLETA_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

export function getAllowedBoletaTransitions(from: BoletaJourneyStage): BoletaJourneyStage[] {
  return [...(TRANSITIONS[from] ?? [])]
}

export function canBoletaTransition(from: BoletaJourneyStage, to: BoletaJourneyStage): boolean {
  if (from === to) return false
  return getAllowedBoletaTransitions(from).includes(to)
}

export function boletaStageDisplayName(stage: BoletaJourneyStage): string {
  return stage
}

function loadJourneyMap(): Record<string, BoletaJourneyStage> {
  if (!isLocalDetailStorageActive()) return {}
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const map: Record<string, BoletaJourneyStage> = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === 'string') map[id] = value as BoletaJourneyStage
    }
    return map
  } catch {
    return {}
  }
}

export function loadBoletaJourneyOverride(boletaId: string): BoletaJourneyStage | undefined {
  return loadJourneyMap()[boletaId]
}

export function saveBoletaJourneyOverride(boletaId: string, stage: BoletaJourneyStage) {
  if (!isLocalDetailStorageActive()) return
  try {
    const map = loadJourneyMap()
    map[boletaId] = stage
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function removeBoletaJourneyOverride(boletaId: string): void {
  try {
    const map = loadJourneyMap()
    if (!map[boletaId]) return
    delete map[boletaId]
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function resolveBoletaJourneyStage(
  boletaId: string,
  seedStage: BoletaJourneyStage,
): BoletaJourneyStage {
  if (!isLocalDetailStorageActive()) return seedStage
  return loadBoletaJourneyOverride(boletaId) ?? seedStage
}

export function legacyStatusToBoletaJourney(status: BoletaStatus): BoletaJourneyStage {
  switch (status) {
    case 'Borrador':
    case 'Emitida':
    case 'Anulada':
      return status
    default:
      return 'Borrador'
  }
}

export const BOLETA_OFF_ROUTE_ENTRY_MAIN_STAGES: BoletaJourneyMainStage[] = [
  ...BOLETA_JOURNEY_MAIN_LINE,
]

export function getBoletaMainLineTransitions(
  from: BoletaJourneyStage,
): BoletaJourneyMainStage[] {
  return getAllowedBoletaTransitions(from).filter(isBoletaMainLineStage)
}

export function getBoletaOffRouteTransitions(
  from: BoletaJourneyStage,
): BoletaJourneyOffRouteStage[] {
  return getAllowedBoletaTransitions(from).filter(isBoletaOffRouteStage)
}

export function inferBoletaPausedFromMainStage(
  current: BoletaJourneyStage,
  history: BoletaStatusHistoryEntry[] = [],
): BoletaJourneyMainStage {
  if (!isBoletaOffRouteStage(current)) return 'Borrador'
  const entry = [...history].reverse().find((h) => h.status === current)
  if (entry?.pausedFromMain) return entry.pausedFromMain
  return 'Borrador'
}

export function getBoletaResumeMainStage(
  current: BoletaJourneyStage,
  history: BoletaStatusHistoryEntry[] = [],
): BoletaJourneyMainStage | null {
  if (!isBoletaOffRouteStage(current)) return null
  return inferBoletaPausedFromMainStage(current, history)
}

export function getBoletaPreviousMainStage(
  stage: BoletaJourneyMainStage,
): BoletaJourneyMainStage | null {
  const idx = BOLETA_JOURNEY_MAIN_LINE.indexOf(stage)
  if (idx <= 0) return null
  return BOLETA_JOURNEY_MAIN_LINE[idx - 1]!
}

export function buildBoletaJourneyHistoryOnTransition(
  from: BoletaJourneyStage,
  to: BoletaJourneyStage,
  existing?: BoletaStatusHistoryEntry[],
): BoletaStatusHistoryEntry[] {
  let history = existing ?? []
  if (!history.some((e) => e.status === to)) {
    const entry: BoletaStatusHistoryEntry = {
      id: `bol-st-${Date.now()}`,
      status: to,
      at: new Date().toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      note: 'Cambio de estado',
    }
    if (isBoletaOffRouteStage(to) && isBoletaMainLineStage(from)) {
      entry.pausedFromMain = from
    }
    history = [...history, entry]
  }
  return history
}
