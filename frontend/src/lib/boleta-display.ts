import type { BoletaListItem, BoletaStatus } from '@/data/boletas.mock'
import {
  boletaStageDisplayName,
  legacyStatusToBoletaJourney,
  resolveBoletaJourneyStage,
  type BoletaJourneyStage,
} from '@/lib/boleta-journey'

export function resolveBoletaListStage(
  boleta: Pick<BoletaListItem, 'id' | 'status'>,
): BoletaJourneyStage {
  return resolveBoletaJourneyStage(
    boleta.id,
    legacyStatusToBoletaJourney(boleta.status),
  )
}

export function boletaListStatusLabel(
  boleta: Pick<BoletaListItem, 'id' | 'status'>,
): string {
  return boletaStageDisplayName(resolveBoletaListStage(boleta))
}

export function withResolvedBoletaListStatus(row: BoletaListItem): BoletaListItem {
  const stage = resolveBoletaListStage(row)
  return { ...row, status: stage as BoletaStatus }
}

export function boletaStatusVariant(
  status: BoletaStatus,
): 'customer' | 'negotiation' | 'destructive' | 'muted' {
  switch (status) {
    case 'Emitida':
      return 'customer'
    case 'Borrador':
      return 'muted'
    case 'Anulada':
      return 'destructive'
    default:
      return 'negotiation'
  }
}

export function parseBoletaAmountNum(amount: string): number {
  return Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
}

export function formatBoletaAmount(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}

export function boletaBuyerDisplayName(
  boleta: Pick<
    BoletaListItem,
    'buyerName' | 'contactName' | 'companyName'
  >,
): string {
  const buyerName = asTrimmedString(boleta.buyerName)
  if (buyerName) return buyerName
  const contactName = asTrimmedString(boleta.contactName)
  if (contactName) return contactName
  return asTrimmedString(boleta.companyName) || 'Sin comprador'
}

function asTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

/** Texto libre de observaciones del comprobante (no confundir con notas de entidad). */
export function boletaObservationText(value: unknown): string {
  return asTrimmedString(value)
}
