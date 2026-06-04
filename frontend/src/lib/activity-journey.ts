import type { ActivityDetail, ActivityStatusHistoryEntry } from '@/data/activity-detail.mock'
import type { ActivityStatus } from '@/data/activities.mock'

/** Flujo principal de ejecución de la actividad */
export const ACTIVITY_JOURNEY_MAIN_LINE = [
  'Pendiente',
  'En curso',
  'Completada',
] as const

/** Estados fuera de la ruta principal */
export const ACTIVITY_JOURNEY_OFF_ROUTE = ['Vencida'] as const

export type ActivityJourneyMainStage = (typeof ACTIVITY_JOURNEY_MAIN_LINE)[number]
export type ActivityJourneyOffRouteStage = (typeof ACTIVITY_JOURNEY_OFF_ROUTE)[number]
export type ActivityJourneyStage = ActivityJourneyMainStage | ActivityJourneyOffRouteStage

export const ACTIVITY_JOURNEY_STAGE_OPTIONS: ActivityJourneyStage[] = [
  ...ACTIVITY_JOURNEY_MAIN_LINE,
  ...ACTIVITY_JOURNEY_OFF_ROUTE,
]

export type ActivityJourneyHistoryEntry = {
  id: string
  stage: ActivityJourneyStage
  enteredAt: string
  note?: string
  pausedFromMain?: ActivityJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: ActivityJourneyHistoryEntry[]
}

export const ACTIVITY_OFF_ROUTE_ENTRY_MAIN_STAGES: ActivityJourneyMainStage[] = [
  'Pendiente',
  'En curso',
]

export function isOffRouteStage(
  stage: ActivityJourneyStage,
): stage is ActivityJourneyOffRouteStage {
  return (ACTIVITY_JOURNEY_OFF_ROUTE as readonly string[]).includes(stage)
}

export function isMainLineStage(
  stage: ActivityJourneyStage,
): stage is ActivityJourneyMainStage {
  return (ACTIVITY_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

const TRANSITIONS: Record<ActivityJourneyStage, ActivityJourneyStage[]> = {
  Pendiente: ['En curso', 'Vencida'],
  'En curso': ['Completada', 'Vencida'],
  Completada: [],
  Vencida: [],
}

export function getPreviousMainStage(
  stage: ActivityJourneyMainStage,
): ActivityJourneyMainStage | null {
  const index = ACTIVITY_JOURNEY_MAIN_LINE.indexOf(stage)
  if (index <= 0) return null
  return ACTIVITY_JOURNEY_MAIN_LINE[index - 1]!
}

export function inferPausedFromMainStage(
  current: ActivityJourneyStage,
  history?: ActivityJourneyHistoryEntry[],
): ActivityJourneyMainStage {
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

  return 'Pendiente'
}

export function getAllowedTransitions(
  from: ActivityJourneyStage,
  ctx?: JourneyTransitionContext,
): ActivityJourneyStage[] {
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
  from: ActivityJourneyStage,
  ctx?: JourneyTransitionContext,
): ActivityJourneyMainStage[] {
  return getAllowedTransitions(from, ctx).filter(isMainLineStage)
}

export function getOffRouteTransitions(
  from: ActivityJourneyStage,
): ActivityJourneyOffRouteStage[] {
  return (TRANSITIONS[from] ?? []).filter(isOffRouteStage)
}

export function getResumeMainStage(
  current: ActivityJourneyStage,
  history?: ActivityJourneyHistoryEntry[],
): ActivityJourneyMainStage {
  return inferPausedFromMainStage(current, history)
}

export function journeyHistoryFromStatusHistory(
  entries: ActivityStatusHistoryEntry[],
): ActivityJourneyHistoryEntry[] {
  return entries.map((e) => ({
    id: e.id,
    stage: e.status as ActivityJourneyStage,
    enteredAt: e.at,
    note: e.note,
    pausedFromMain:
      e.status === 'Vencida'
        ? inferPausedFromMainStage(
            'Vencida',
            entries.map((h) => ({
              id: h.id,
              stage: h.status as ActivityJourneyStage,
              enteredAt: h.at,
            })),
          )
        : undefined,
  }))
}

export function appendStatusHistory(
  prev: ActivityStatusHistoryEntry[],
  status: ActivityStatus,
  at = 'Ahora',
): ActivityStatusHistoryEntry[] {
  if (prev.some((e) => e.status === status)) {
    return prev.map((e) =>
      e.status === status ? { ...e, at, note: 'Estado actual' } : e,
    )
  }
  return [
    ...prev.map((e) => ({ ...e, note: e.note === 'Estado actual' ? undefined : e.note })),
    {
      id: `st-${Date.now()}`,
      status,
      at,
      note: 'Estado actual',
    },
  ]
}

/** Aplica un cambio de estado en el detalle (historial local + campos derivados). */
export function activityDetailWithStatus(
  activity: ActivityDetail,
  status: ActivityStatus,
): ActivityDetail {
  return {
    ...activity,
    status,
    statusHistory: appendStatusHistory(activity.statusHistory, status),
    completedAt:
      status === 'Completada' ? activity.completedAt ?? 'Recién completada' : undefined,
    outcome:
      status === 'Completada'
        ? activity.outcome ?? 'Completada correctamente.'
        : activity.outcome,
  }
}
