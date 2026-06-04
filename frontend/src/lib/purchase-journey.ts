import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { PurchaseStatus } from '@/data/purchases.mock'

/** Flujo de emisión de orden de compra */
export const PURCHASE_JOURNEY_MAIN_LINE = [
  'Borrador',
  'Emitida',
  'Confirmada',
] as const

export type PurchaseJourneyMainStage = (typeof PURCHASE_JOURNEY_MAIN_LINE)[number]
export type PurchaseJourneyOffRouteStage = never
export type PurchaseJourneyStage = PurchaseJourneyMainStage

export type PurchaseStageHistory = {
  id: string
  stage: PurchaseJourneyStage
  enteredAt: string
  note?: string
  pausedFromMain?: PurchaseJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: PurchaseStageHistory[]
}

const JOURNEY_KEY = `${STORAGE_PREFIX}-crm-purchase-journey`

export function isOffRouteStage(_stage: PurchaseJourneyStage): _stage is PurchaseJourneyOffRouteStage {
  return false
}

export function isMainLineStage(
  stage: PurchaseJourneyStage,
): stage is PurchaseJourneyMainStage {
  return (PURCHASE_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

const TRANSITIONS: Record<PurchaseJourneyStage, PurchaseJourneyStage[]> = {
  Borrador: ['Emitida'],
  Emitida: ['Confirmada', 'Borrador'],
  Confirmada: ['Emitida'],
}

export const PURCHASE_JOURNEY_OFF_ROUTE: readonly PurchaseJourneyOffRouteStage[] = []
export const PURCHASE_OFF_ROUTE_ENTRY_MAIN_STAGES: PurchaseJourneyMainStage[] = []

export function getPreviousMainStage(
  stage: PurchaseJourneyMainStage,
): PurchaseJourneyMainStage | null {
  const index = PURCHASE_JOURNEY_MAIN_LINE.indexOf(stage)
  if (index <= 0) return null
  return PURCHASE_JOURNEY_MAIN_LINE[index - 1]!
}

export function inferPausedFromMainStage(
  current: PurchaseJourneyStage,
  _history?: PurchaseStageHistory[],
): PurchaseJourneyMainStage {
  if (isMainLineStage(current)) return current
  return 'Borrador'
}

export function getAllowedTransitions(
  from: PurchaseJourneyStage,
  _ctx?: JourneyTransitionContext,
): PurchaseJourneyStage[] {
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
  from: PurchaseJourneyStage,
  ctx?: JourneyTransitionContext,
): PurchaseJourneyMainStage[] {
  return getAllowedTransitions(from, ctx).filter(isMainLineStage)
}

export function getOffRouteTransitions(_from: PurchaseJourneyStage): PurchaseJourneyOffRouteStage[] {
  return []
}

export function canTransition(
  from: PurchaseJourneyStage,
  to: PurchaseJourneyStage,
  ctx?: JourneyTransitionContext,
): boolean {
  return getAllowedTransitions(from, ctx).includes(to)
}

export function getResumeMainStage(
  current: PurchaseJourneyStage,
  history?: PurchaseStageHistory[],
): PurchaseJourneyMainStage {
  return inferPausedFromMainStage(current, history)
}

export function journeyStageToListStatus(stage: PurchaseJourneyStage): PurchaseStatus {
  return stage
}

export function purchaseJourneyStageVariant(
  stage: PurchaseJourneyStage,
): 'proposal' | 'negotiation' | 'customer' | 'destructive' | 'muted' | 'secondary' {
  switch (stage) {
    case 'Confirmada':
      return 'customer'
    case 'Emitida':
      return 'proposal'
    case 'Borrador':
    default:
      return 'muted'
  }
}

export type PurchaseKanbanColumn = PurchaseJourneyMainStage

export function purchaseKanbanColumn(stage: PurchaseJourneyStage): PurchaseKanbanColumn {
  return stage
}

export function loadPurchaseJourneyOverride(
  purchaseId: string,
): PurchaseJourneyStage | undefined {
  if (!isLocalDetailStorageActive()) return undefined
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return undefined
    const map = JSON.parse(raw) as Record<string, PurchaseJourneyStage>
    return map[purchaseId]
  } catch {
    return undefined
  }
}

export function savePurchaseJourneyOverride(purchaseId: string, stage: PurchaseJourneyStage) {
  if (!isLocalDetailStorageActive()) return
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, PurchaseJourneyStage>) : {}
    map[purchaseId] = stage
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function removePurchaseJourneyOverride(purchaseId: string) {
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, PurchaseJourneyStage>
    if (!map[purchaseId]) return
    delete map[purchaseId]
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function resolvePurchaseJourneyStage(
  purchaseId: string,
  seedStage: PurchaseJourneyStage,
): PurchaseJourneyStage {
  if (!isLocalDetailStorageActive()) return seedStage
  return loadPurchaseJourneyOverride(purchaseId) ?? seedStage
}

export function buildPurchaseStageHistoryOnTransition(
  from: PurchaseJourneyStage,
  to: PurchaseJourneyStage,
  existing?: PurchaseStageHistory[],
): PurchaseStageHistory[] {
  let history = existing ?? []
  const dateStr = new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (!history.some((e) => e.stage === to)) {
    history = [
      ...history,
      {
        id: `pur-st-${Date.now()}`,
        stage: to,
        enteredAt: dateStr,
        note: from !== to ? 'Cambio de etapa' : undefined,
      },
    ]
  }

  return history
}

/** Mapea estados legacy de recepción al flujo de emisión OC. */
export function legacyStatusToPurchaseJourney(status: string): PurchaseJourneyStage {
  switch (status) {
    case 'Borrador':
    case 'Emitida':
    case 'Confirmada':
      return status
    case 'Recibida':
      return 'Confirmada'
    case 'Parcial':
    case 'Pendiente':
    case 'En espera proveedor':
      return 'Emitida'
    case 'Cancelada':
      return 'Borrador'
    default:
      return 'Borrador'
  }
}

/** OC abierta para tránsito / ingreso (emitida o confirmada por proveedor). */
export function isPurchaseOpenForStock(status: PurchaseStatus): boolean {
  return status === 'Emitida' || status === 'Confirmada'
}
