import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { InvoiceStatus } from '@/data/invoices.mock'

/** Flujo principal de cobro */
export const INVOICE_JOURNEY_MAIN_LINE = ['Borrador', 'Pendiente', 'Pagada'] as const

/** Estados fuera de la ruta principal */
export const INVOICE_JOURNEY_OFF_ROUTE = ['Vencida', 'Anulada'] as const

export type InvoiceJourneyMainStage = (typeof INVOICE_JOURNEY_MAIN_LINE)[number]
export type InvoiceJourneyOffRouteStage = (typeof INVOICE_JOURNEY_OFF_ROUTE)[number]
export type InvoiceJourneyStage = InvoiceJourneyMainStage | InvoiceJourneyOffRouteStage

export const INVOICE_JOURNEY_STAGE_OPTIONS: InvoiceJourneyStage[] = [
  ...INVOICE_JOURNEY_MAIN_LINE,
  ...INVOICE_JOURNEY_OFF_ROUTE,
]

export type InvoiceStatusHistoryEntry = {
  id: string
  status: InvoiceJourneyStage
  at: string
  note?: string
  pausedFromMain?: InvoiceJourneyMainStage
}

export type JourneyTransitionContext = {
  history?: InvoiceStatusHistoryEntry[]
}

const JOURNEY_KEY = `${STORAGE_PREFIX}-crm-invoice-journey`

export function isOffRouteStage(stage: InvoiceJourneyStage): stage is InvoiceJourneyOffRouteStage {
  return (INVOICE_JOURNEY_OFF_ROUTE as readonly string[]).includes(stage)
}

export function isMainLineStage(stage: InvoiceJourneyStage): stage is InvoiceJourneyMainStage {
  return (INVOICE_JOURNEY_MAIN_LINE as readonly string[]).includes(stage)
}

const TRANSITIONS: Record<InvoiceJourneyStage, InvoiceJourneyStage[]> = {
  Borrador: ['Pendiente', 'Anulada'],
  Pendiente: ['Pagada', 'Vencida', 'Anulada', 'Borrador'],
  Pagada: ['Anulada'],
  Vencida: ['Pendiente', 'Pagada', 'Anulada'],
  Anulada: ['Borrador'],
}

export const INVOICE_OFF_ROUTE_ENTRY_MAIN_STAGES: InvoiceJourneyMainStage[] = [
  'Pendiente',
]

export function getAllowedTransitions(
  from: InvoiceJourneyStage,
  ctx?: JourneyTransitionContext,
): InvoiceJourneyStage[] {
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

export function canTransition(
  from: InvoiceJourneyStage,
  to: InvoiceJourneyStage,
  ctx?: JourneyTransitionContext,
): boolean {
  if (from === to) return false
  return getAllowedTransitions(from, ctx).includes(to)
}

export function getMainLineTransitions(
  from: InvoiceJourneyStage,
  ctx?: JourneyTransitionContext,
): InvoiceJourneyStage[] {
  return getAllowedTransitions(from, ctx).filter((s) => isMainLineStage(s))
}

export function getOffRouteTransitions(
  from: InvoiceJourneyStage,
  ctx?: JourneyTransitionContext,
): InvoiceJourneyStage[] {
  return getAllowedTransitions(from, ctx).filter((s) => isOffRouteStage(s))
}

/** Etiqueta visible en UI (p. ej. Pendiente → Emitida). */
export function invoiceStageDisplayName(stage: InvoiceJourneyStage): string {
  if (stage === 'Pendiente') return 'Emitida'
  return stage
}

export function sortMainLineStages(
  stages: InvoiceJourneyStage[],
): InvoiceJourneyMainStage[] {
  return INVOICE_JOURNEY_MAIN_LINE.filter((s) =>
    (stages as readonly string[]).includes(s),
  )
}

export function getPreviousMainStage(
  stage: InvoiceJourneyMainStage,
): InvoiceJourneyMainStage | null {
  const idx = INVOICE_JOURNEY_MAIN_LINE.indexOf(stage)
  if (idx <= 0) return null
  return INVOICE_JOURNEY_MAIN_LINE[idx - 1]!
}

export function inferPausedFromMainStage(
  current: InvoiceJourneyStage,
  history: InvoiceStatusHistoryEntry[] = [],
  invoiceId?: string,
): InvoiceJourneyMainStage {
  if (isMainLineStage(current)) return current

  const stored = invoiceId ? loadInvoiceJourneyRecord(invoiceId)?.pausedFromMain : undefined
  if (stored && isMainLineStage(stored)) return stored

  const entry = [...history].reverse().find((e) => e.status === current)
  if (entry?.pausedFromMain) return entry.pausedFromMain

  const idx = history.findIndex((e) => e.status === current)
  if (idx > 0) {
    for (let i = idx - 1; i >= 0; i--) {
      const h = history[i]!
      if (isMainLineStage(h.status)) return h.status
    }
  }

  const mains = history.map((e) => e.status).filter(isMainLineStage)
  if (mains.length > 0) return mains[mains.length - 1]!

  return 'Pendiente'
}

export function getResumeMainStage(
  offRoute: InvoiceJourneyOffRouteStage,
  history: InvoiceStatusHistoryEntry[] = [],
  invoiceId?: string,
): InvoiceJourneyMainStage {
  return inferPausedFromMainStage(offRoute, history, invoiceId)
}

export type InvoiceJourneyOverride = {
  stage: InvoiceJourneyStage
  siiNumber?: string
  pausedFromMain?: InvoiceJourneyMainStage
}

function parseJourneyMapEntry(value: unknown): InvoiceJourneyOverride | undefined {
  if (typeof value === 'string') {
    return { stage: value as InvoiceJourneyStage }
  }
  if (value && typeof value === 'object' && 'stage' in value) {
    const entry = value as InvoiceJourneyOverride
    if (typeof entry.stage !== 'string') return undefined
    const pausedFromMain =
      entry.pausedFromMain && isMainLineStage(entry.pausedFromMain)
        ? entry.pausedFromMain
        : undefined
    return { stage: entry.stage, siiNumber: entry.siiNumber, pausedFromMain }
  }
  return undefined
}

function loadJourneyMap(): Record<string, InvoiceJourneyOverride> {
  if (!isLocalDetailStorageActive()) return {}
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const map: Record<string, InvoiceJourneyOverride> = {}
    for (const [id, value] of Object.entries(parsed)) {
      const entry = parseJourneyMapEntry(value)
      if (entry) map[id] = entry
    }
    return map
  } catch {
    return {}
  }
}

export function loadInvoiceJourneyRecord(invoiceId: string): InvoiceJourneyOverride | undefined {
  return loadJourneyMap()[invoiceId]
}

export function loadInvoiceJourneyOverride(invoiceId: string): InvoiceJourneyStage | undefined {
  return loadInvoiceJourneyRecord(invoiceId)?.stage
}

export function resolveInvoiceSiiNumber(
  invoiceId: string,
  seedSii?: string,
): string | undefined {
  if (!isLocalDetailStorageActive()) return seedSii
  const record = loadInvoiceJourneyRecord(invoiceId)
  if (record && 'siiNumber' in record && record.siiNumber !== undefined) {
    const trimmed = record.siiNumber.trim()
    return trimmed || undefined
  }
  return seedSii
}

export function removeInvoiceJourneyOverride(invoiceId: string): void {
  try {
    const map = loadJourneyMap()
    if (!map[invoiceId]) return
    delete map[invoiceId]
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function saveInvoiceJourneyOverride(
  invoiceId: string,
  stage: InvoiceJourneyStage,
  siiNumber?: string,
  pausedFromMain?: InvoiceJourneyMainStage,
) {
  if (!isLocalDetailStorageActive()) return
  try {
    const map = loadJourneyMap()
    const prev = map[invoiceId]
    const nextPaused =
      pausedFromMain !== undefined
        ? pausedFromMain
        : isOffRouteStage(stage)
          ? prev?.pausedFromMain
          : undefined
    map[invoiceId] = {
      stage,
      siiNumber: siiNumber !== undefined ? siiNumber : prev?.siiNumber,
      pausedFromMain: nextPaused,
    }
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function resolveInvoiceJourneyStage(
  invoiceId: string,
  seedStage: InvoiceJourneyStage,
): InvoiceJourneyStage {
  if (!isLocalDetailStorageActive()) return seedStage
  return loadInvoiceJourneyOverride(invoiceId) ?? seedStage
}

export function legacyStatusToInvoiceJourney(status: InvoiceStatus): InvoiceJourneyStage {
  switch (status) {
    case 'Borrador':
    case 'Pendiente':
    case 'Pagada':
    case 'Vencida':
    case 'Anulada':
      return status
    default:
      return 'Borrador'
  }
}

export function buildInvoiceJourneyHistoryOnTransition(
  from: InvoiceJourneyStage,
  to: InvoiceJourneyStage,
  existing?: InvoiceStatusHistoryEntry[],
): InvoiceStatusHistoryEntry[] {
  let history = existing ?? []

  if (
    isMainLineStage(from) &&
    isOffRouteStage(to) &&
    !history.some((e) => e.status === from)
  ) {
    history = [
      ...history,
      {
        id: `inv-st-${Date.now()}-from`,
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
    const entry: InvoiceStatusHistoryEntry = {
      id: `inv-st-${Date.now()}`,
      status: to,
      at: new Date().toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      note: 'Cambio de estado',
    }
    if (isOffRouteStage(to) && isMainLineStage(from)) {
      entry.pausedFromMain = from
    }
    history = [...history, entry]
  }

  return history
}
