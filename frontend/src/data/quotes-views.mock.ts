import type { QuoteListItem } from '@/data/quotes.mock'
import { QUOTE_JOURNEY_MAIN_LINE } from '@/lib/quote-journey'

export const QUOTE_KANBAN_COLUMNS: {
  status: (typeof QUOTE_JOURNEY_MAIN_LINE)[number]
  description: string
}[] = [
  { status: 'Borrador', description: 'En preparación' },
  { status: 'En revisión interna', description: 'Validación comercial' },
  { status: 'Enviada', description: 'En manos del cliente' },
  { status: 'En negociación', description: 'Ajustes y condiciones' },
  { status: 'Aceptada', description: 'Cerrada favorablemente' },
]

export function getQuotesBoardDataset(): QuoteListItem[] {
  return []
}

function parseQuoteAmount(amount: string): number {
  return Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
}

export function filterQuotes(
  items: QuoteListItem[],
  query: string,
  matches?: (item: QuoteListItem) => boolean,
): QuoteListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (quote) =>
        quote.code.toLowerCase().includes(q) ||
        quote.title.toLowerCase().includes(q) ||
        quote.opportunityName.toLowerCase().includes(q) ||
        quote.companyName.toLowerCase().includes(q) ||
        quote.owner.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type QuoteSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: QuoteListItem) => boolean
}

export const quoteSegments: QuoteSegment[] = [
  {
    id: 'drafts',
    name: 'Borradores',
    description: 'Cotizaciones aún en preparación.',
    accentClass: 'border-s-muted-foreground',
    matches: (q) => q.status === 'Borrador' || q.status === 'En revisión interna',
  },
  {
    id: 'active',
    name: 'En curso',
    description: 'Enviadas o en negociación con el cliente.',
    accentClass: 'border-s-sky-500',
    matches: (q) => q.status === 'Enviada' || q.status === 'En negociación' || q.status === 'En espera cliente',
  },
  {
    id: 'accepted',
    name: 'Aceptadas',
    description: 'Propuestas ganadas listas para facturar.',
    accentClass: 'border-s-emerald-500',
    matches: (q) => q.status === 'Aceptada',
  },
  {
    id: 'high-value',
    name: 'Monto > $50.000',
    description: 'Cotizaciones de alto importe.',
    accentClass: 'border-s-violet-500',
    matches: (q) => parseQuoteAmount(q.amount) >= 50000,
  },
  {
    id: 'closed-negative',
    name: 'Rechazadas / vencidas',
    description: 'Propuestas no concretadas.',
    accentClass: 'border-s-destructive',
    matches: (q) =>
      q.status === 'Rechazada' || q.status === 'Cancelada' || q.status === 'Vencida',
  },
]

export function countQuoteSegmentMatches(
  items: QuoteListItem[],
  segment: QuoteSegment,
): number {
  return items.filter(segment.matches).length
}
