import type { InventoryListItem } from '@/data/inventory.mock'
import type { InventoryKanbanColumn } from '@/lib/inventory-status'

export const INVENTORY_KANBAN_COLUMNS: {
  status: InventoryKanbanColumn
  description: string
}[] = [
  { status: 'En stock', description: 'Disponible para uso o venta' },
  { status: 'Stock bajo', description: 'Por debajo del mínimo' },
  { status: 'Quiebre de stock', description: 'Sin disponible con reservas activas' },
  { status: 'Sin stock', description: 'Sin unidades disponibles' },
  { status: 'Reservado', description: 'Comprometido a pedidos' },
]

export function getInventoryBoardDataset(): InventoryListItem[] {
  return []
}

export function filterInventory(
  items: InventoryListItem[],
  query: string,
  matches?: (item: InventoryListItem) => boolean,
): InventoryListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type InventorySegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: InventoryListItem) => boolean
}

export const inventorySegments: InventorySegment[] = [
  {
    id: 'low',
    name: 'Stock bajo',
    description: 'Productos por debajo del mínimo configurado.',
    accentClass: 'border-s-amber-500',
    matches: (i) => i.status === 'Stock bajo',
  },
  {
    id: 'central',
    name: 'Bodega central',
    description: 'Existencias en almacén principal.',
    accentClass: 'border-s-primary',
    matches: (i) => i.location === 'Bodega central',
  },
  {
    id: 'out',
    name: 'Sin stock',
    description: 'Reposición urgente.',
    accentClass: 'border-s-rose-500',
    matches: (i) => i.status === 'Sin stock',
  },
  {
    id: 'reserved',
    name: 'Reservados',
    description: 'Unidades apartadas para entregas.',
    accentClass: 'border-s-violet-500',
    matches: (i) => i.status === 'Reservado',
  },
]

export function countInventorySegmentMatches(
  items: InventoryListItem[],
  segment: InventorySegment,
): number {
  return items.filter(segment.matches).length
}
