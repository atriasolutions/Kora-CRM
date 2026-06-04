import type { InvoiceListItem, InvoiceStatus } from '@/data/invoices.mock'

export const INVOICE_KANBAN_COLUMNS: {
  status: InvoiceStatus
  description: string
}[] = [
  { status: 'Borrador', description: 'En preparación' },
  { status: 'Pendiente', description: 'Emitidas, cobro pendiente' },
  { status: 'Vencida', description: 'Fuera de plazo' },
  { status: 'Pagada', description: 'Cobradas' },
]

export function getInvoicesBoardDataset(): InvoiceListItem[] {
  return []
}

export function filterInvoices(
  items: InvoiceListItem[],
  query: string,
  matches?: (item: InvoiceListItem) => boolean,
): InvoiceListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (inv) =>
        inv.number.toLowerCase().includes(q) ||
        inv.client.toLowerCase().includes(q) ||
        inv.owner.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type InvoiceSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: InvoiceListItem) => boolean
}

export const invoiceSegments: InvoiceSegment[] = [
  {
    id: 'pending',
    name: 'Por cobrar',
    description: 'Facturas pendientes de pago.',
    accentClass: 'border-s-amber-500',
    matches: (inv) => inv.status === 'Pendiente',
  },
  {
    id: 'overdue',
    name: 'Vencidas',
    description: 'Cobro fuera de plazo.',
    accentClass: 'border-s-destructive',
    matches: (inv) => inv.status === 'Vencida',
  },
  {
    id: 'high-value',
    name: 'Monto > $30.000',
    description: 'Facturas de alto importe.',
    accentClass: 'border-s-emerald-500',
    matches: (inv) => inv.amountNum >= 30000,
  },
  {
    id: 'paid',
    name: 'Pagadas',
    description: 'Cobros confirmados.',
    accentClass: 'border-s-violet-500',
    matches: (inv) => inv.status === 'Pagada',
  },
]

export function countSegmentMatches(
  items: InvoiceListItem[],
  segment: InvoiceSegment,
): number {
  return items.filter(segment.matches).length
}
