import type { InventoryMovementLine } from '@/data/inventory-detail.mock'
import { getAllKnownInvoices } from '@/data/invoices-registry-store'
import { getAllRegistryStockReceipts } from '@/data/stock-receipts-registry-store'

export type InventoryMovementSourceKind =
  | 'ingreso'
  | 'factura'
  | 'ajuste'
  | 'traslado'
  | 'reserva'
  | 'otro'

export type InventoryMovementAdjustmentDetail = {
  field: string
  quantityBefore: number
  quantityAfter: number
  quantityDelta: number
  location?: string
  note?: string
}

export function classifyMovementSource(
  mv: Pick<InventoryMovementLine, 'type' | 'reference' | 'sourceKind'>,
): InventoryMovementSourceKind {
  if (mv.sourceKind) return mv.sourceKind
  const ref = mv.reference.trim()
  if (/^Ingreso\s+/i.test(ref)) return 'ingreso'
  if (/^FAC\s+/i.test(ref) || /^NC\/Anulación\s+/i.test(ref) || /^Anulación\s+/i.test(ref)) {
    return 'factura'
  }
  if (mv.type === 'Ajuste') return 'ajuste'
  if (mv.type === 'Traslado') return 'traslado'
  if (mv.type === 'Reserva') return 'reserva'
  return 'otro'
}

function extractDocumentNumber(reference: string, prefix: RegExp): string | null {
  const match = reference.trim().match(prefix)
  return match?.[1]?.trim() ?? null
}

function findReceiptIdByNumber(number: string): string | undefined {
  const key = number.trim().toLowerCase()
  return getAllRegistryStockReceipts().find((r) => r.number.trim().toLowerCase() === key)?.id
}

function findInvoiceIdByNumber(number: string): string | undefined {
  const key = number.trim().toLowerCase()
  return getAllKnownInvoices().find((inv) => inv.number.trim().toLowerCase() === key)?.id
}

export function resolveMovementDetailHref(mv: InventoryMovementLine): string | null {
  const kind = classifyMovementSource(mv)
  if (kind === 'ingreso') {
    if (mv.sourceId) return `/ingresos/${mv.sourceId}`
    const num =
      extractDocumentNumber(mv.reference, /^Ingreso\s+(.+?)(?:\s·|$)/i) ??
      extractDocumentNumber(mv.reference, /^Ingreso\s+(.+)/i)
    if (!num) return null
    const id = findReceiptIdByNumber(num)
    return id ? `/ingresos/${id}` : null
  }
  if (kind === 'factura') {
    if (mv.sourceId) return `/facturacion/${mv.sourceId}`
    const num =
      extractDocumentNumber(mv.reference, /^FAC\s+(.+?)(?:\s·|$)/i) ??
      extractDocumentNumber(mv.reference, /^FAC\s+(.+)/i) ??
      extractDocumentNumber(mv.reference, /^NC\/Anulación\s+(.+)/i) ??
      extractDocumentNumber(mv.reference, /^Anulación\s+(.+)/i)
    if (!num) return null
    const id = findInvoiceIdByNumber(num)
    return id ? `/facturacion/${id}` : null
  }
  return null
}

export function movementSourceLabel(kind: InventoryMovementSourceKind): string {
  switch (kind) {
    case 'ingreso':
      return 'Ingreso'
    case 'factura':
      return 'Factura'
    case 'ajuste':
      return 'Ajuste de stock'
    case 'traslado':
      return 'Traslado'
    case 'reserva':
      return 'Reserva'
    default:
      return 'Movimiento'
  }
}

export function movementTypeBadgeLabel(
  mv: InventoryMovementLine,
): string {
  const kind = classifyMovementSource(mv)
  if (kind === 'ingreso' || kind === 'factura' || kind === 'ajuste') {
    return movementSourceLabel(kind)
  }
  return mv.type
}

export function formatAdjustmentDetail(detail: InventoryMovementAdjustmentDetail): string {
  const sign = detail.quantityDelta >= 0 ? '+' : ''
  const loc = detail.location ? ` (${detail.location})` : ''
  return `${detail.field}${loc}: ${detail.quantityBefore} → ${detail.quantityAfter} (${sign}${detail.quantityDelta})`
}
