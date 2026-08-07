import type {
  BoletaListItem,
  BoletaPaymentMethod,
  BoletaStatus,
} from '@/data/boletas.mock'
import { BOLETA_PAYMENT_METHOD_OPTIONS, BOLETA_STATUS_OPTIONS } from '@/data/boletas.mock'
import { resolveBoletaListStage } from '@/lib/boleta-display'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type BoletaFilters = {
  statuses: BoletaStatus[]
  paymentMethods: BoletaPaymentMethod[]
  date: ListDateFilter
}

export { BOLETA_STATUS_OPTIONS, BOLETA_PAYMENT_METHOD_OPTIONS }

export function createDefaultBoletaFilters(): BoletaFilters {
  return { statuses: [], paymentMethods: [], date: createDefaultListDateFilter() }
}

export function countActiveBoletaFilters(filters: BoletaFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.paymentMethods.length > 0) n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

export function boletaRowMatchesFilters(row: BoletaListItem, filters: BoletaFilters): boolean {
  if (
    filters.statuses.length > 0 &&
    !filters.statuses.includes(resolveBoletaListStage(row))
  ) {
    return false
  }
  if (
    filters.paymentMethods.length > 0 &&
    !filters.paymentMethods.includes(row.paymentMethod)
  ) {
    return false
  }
  const dateKey = row.createdAt || row.issueDate
  if (!listRowMatchesDateFilter(dateKey, filters.date)) return false
  return true
}

export function boletaFiltersToServerQuery(
  filters: BoletaFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (filters.paymentMethods.length > 0) {
    query.paymentMethod = filters.paymentMethods.join(',')
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}

export type BoletaSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: BoletaListItem) => boolean
}

export const boletaSegments: BoletaSegment[] = [
  {
    id: 'issued',
    name: 'Emitidas',
    description: 'Boletas emitidas al comprador.',
    accentClass: 'border-s-emerald-500',
    matches: (bol) => bol.status === 'Emitida',
  },
  {
    id: 'draft',
    name: 'Borradores',
    description: 'En preparación antes de emitir.',
    accentClass: 'border-s-muted-foreground',
    matches: (bol) => bol.status === 'Borrador',
  },
  {
    id: 'void',
    name: 'Anuladas',
    description: 'Documentos anulados.',
    accentClass: 'border-s-destructive',
    matches: (bol) => bol.status === 'Anulada',
  },
  {
    id: 'high-value',
    name: 'Monto > $15.000',
    description: 'Boletas de alto importe.',
    accentClass: 'border-s-violet-500',
    matches: (bol) => bol.amountNum >= 15000,
  },
]

export function filterBoletas(
  items: BoletaListItem[],
  query: string,
  matches?: (item: BoletaListItem) => boolean,
): BoletaListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (bol) =>
        bol.number.toLowerCase().includes(q) ||
        bol.buyerName.toLowerCase().includes(q) ||
        bol.owner.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export function countBoletaSegmentMatches(
  items: BoletaListItem[],
  segment: BoletaSegment,
): number {
  return items.filter(segment.matches).length
}
