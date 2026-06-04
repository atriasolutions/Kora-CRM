import type { ProductListItem, ProductStatus } from '@/data/products.mock'

export const PRODUCT_KANBAN_COLUMNS: {
  status: ProductStatus
  description: string
}[] = [
  { status: 'Activo', description: 'Disponibles en catálogo' },
  { status: 'Agotado', description: 'Sin stock o cupos' },
  { status: 'Borrador', description: 'Pendientes de publicar' },
]

export function getProductsBoardDataset(): ProductListItem[] {
  return []
}

export function filterProducts(
  items: ProductListItem[],
  query: string,
  matches?: (item: ProductListItem) => boolean,
): ProductListItem[] {
  let rows = items
  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }
  if (matches) rows = rows.filter(matches)
  return rows
}

export type ProductSegment = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (item: ProductListItem) => boolean
}

export const productSegments: ProductSegment[] = [
  {
    id: 'active',
    name: 'Activos',
    description: 'Productos publicados y vendibles.',
    accentClass: 'border-s-primary',
    matches: (p) => p.status === 'Activo',
  },
  {
    id: 'subscription',
    name: 'Suscripciones',
    description: 'Planes recurrentes del catálogo.',
    accentClass: 'border-s-sky-500',
    matches: (p) => p.category === 'Suscripción',
  },
  {
    id: 'low-stock',
    name: 'Stock bajo',
    description: 'Cupos o unidades limitadas.',
    accentClass: 'border-s-amber-500',
    matches: (p) => p.stockNum > 0 && p.stockNum <= 12,
  },
  {
    id: 'draft',
    name: 'Borradores',
    description: 'Pendientes de activación.',
    accentClass: 'border-s-violet-500',
    matches: (p) => p.status === 'Borrador',
  },
]

export function countSegmentMatches(
  items: ProductListItem[],
  segment: ProductSegment,
): number {
  return items.filter(segment.matches).length
}
