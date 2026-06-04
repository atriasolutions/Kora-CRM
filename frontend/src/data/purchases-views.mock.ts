import type { PurchaseListItem, PurchaseStatus } from '@/data/purchases.mock'
import { purchaseListSeed } from '@/data/purchases.mock'

export const PURCHASE_KANBAN_COLUMNS: {
  status: PurchaseStatus
  description: string
}[] = [
  { status: 'Borrador', description: 'Órdenes en preparación' },
  { status: 'Emitida', description: 'OC enviada al proveedor' },
  { status: 'Confirmada', description: 'Confirmada por proveedor' },
]

export function getPurchasesBoardDataset(): PurchaseListItem[] {
  return purchaseListSeed
}

export function filterPurchases(
  items: PurchaseListItem[],
  query: string,
  matches?: (item: PurchaseListItem) => boolean,
): PurchaseListItem[] {
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    if (matches && !matches(item)) return false
    if (!q) return true
    return (
      item.reference.toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q) ||
      item.productSummary.toLowerCase().includes(q) ||
      item.owner.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q)
    )
  })
}

export type PurchaseSegmentDef = {
  id: string
  name: string
  description: string
  matches: (p: PurchaseListItem) => boolean
}

export const purchaseSegments: PurchaseSegmentDef[] = [
  {
    id: 'borradores',
    name: 'Borradores',
    description: 'Órdenes aún no emitidas',
    matches: (p) => p.status === 'Borrador',
  },
  {
    id: 'emitidas',
    name: 'Emitidas',
    description: 'OC enviadas al proveedor',
    matches: (p) => p.status === 'Emitida',
  },
  {
    id: 'confirmadas',
    name: 'Confirmadas',
    description: 'Confirmadas por el proveedor',
    matches: (p) => p.status === 'Confirmada',
  },
  {
    id: 'alto-monto',
    name: 'Alto monto',
    description: 'Más de $10.000',
    matches: (p) => p.amountNum >= 10000,
  },
]

export function countPurchaseSegmentMatches(
  items: PurchaseListItem[],
  segment: PurchaseSegmentDef,
): number {
  return items.filter(segment.matches).length
}
