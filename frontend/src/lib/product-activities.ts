import { productListSeed, type ProductListItem } from '@/data/products.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { buildEntityActivitiesForDetail } from '@/lib/entity-activity-build'
import { entityFormToCreateValues, type ActivityFormPayload } from '@/lib/entity-activity-form'

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'nota',
    title: 'Revisión de pricing',
    description: 'Alinear precio de lista con cotizaciones activas.',
    when: 'Hoy, 11:00',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'email',
    title: 'Ficha técnica actualizada',
    when: 'Ayer, 16:00',
    createdAt: '15 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'reunion',
    title: 'Validación de catálogo con ventas',
    when: '8 may, 10:30',
    createdAt: '8 may 2024',
    author: 'Ana Ruiz',
  },
]

export function productRelatedIds(product: { id: string }): Set<string> {
  const ids = new Set<string>([product.id])
  const pageMatch = /^productos-(\d+)$/.exec(product.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = productListSeed[idx % productListSeed.length]
    if (seed) ids.add(seed.id)
  }
  return ids
}

export function buildProductActivitiesForDetail(
  product: ProductListItem,
): ContactActivity[] {
  const ids = productRelatedIds(product)
  return buildEntityActivitiesForDetail({
    relatedType: 'producto',
    entityId: product.id,
    relatedName: product.name,
    companyName: product.category,
    relatedIds: ids,
    matchExtra: (a) => a.relatedName === product.name || a.relatedName === product.sku,
    templates: activityTemplates,
    seedRecordFilter: (a) => a.relatedType === 'producto',
  })
}

export function productFormToCreateValues(
  productId: string,
  productName: string,
  sku: string,
  form: ActivityFormPayload,
) {
  return entityFormToCreateValues('producto', productId, productName, sku, form)
}
