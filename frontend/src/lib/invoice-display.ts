import type { InvoiceListItem, InvoiceStatus } from '@/data/invoices.mock'
import {
  invoiceStageDisplayName,
  legacyStatusToInvoiceJourney,
  resolveInvoiceJourneyStage,
  type InvoiceJourneyStage,
} from '@/lib/invoice-journey'

/** Etapa efectiva (API + override de ruta del éxito en localStorage). */
export function resolveInvoiceListStage(
  invoice: Pick<InvoiceListItem, 'id' | 'status'>,
): InvoiceJourneyStage {
  return resolveInvoiceJourneyStage(
    invoice.id,
    legacyStatusToInvoiceJourney(invoice.status),
  )
}

/** Etiqueta unificada lista / kanban / detalle (p. ej. Pendiente → Emitida). */
export function invoiceListStatusLabel(
  invoice: Pick<InvoiceListItem, 'id' | 'status'>,
): string {
  return invoiceStageDisplayName(resolveInvoiceListStage(invoice))
}

export function withResolvedInvoiceListStatus(row: InvoiceListItem): InvoiceListItem {
  const stage = resolveInvoiceListStage(row)
  return { ...row, status: stage as InvoiceStatus }
}

export function invoiceStatusVariant(
  status: InvoiceStatus,
): 'customer' | 'negotiation' | 'destructive' | 'muted' {
  switch (status) {
    case 'Pagada':
      return 'customer'
    case 'Vencida':
      return 'destructive'
    case 'Borrador':
      return 'muted'
    case 'Anulada':
      return 'destructive'
    case 'Pendiente':
    default:
      return 'negotiation'
  }
}

export function parseAmountNum(amount: string): number {
  return Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
}

export function formatAmount(value: number): string {
  return `$${value.toLocaleString('es-CL')}`
}
