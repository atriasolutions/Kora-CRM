import { inventoryListSeed, type InventoryListItem } from '@/data/inventory.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { buildEntityActivitiesForDetail } from '@/lib/entity-activity-build'
import { entityFormToCreateValues, type ActivityFormPayload } from '@/lib/entity-activity-form'

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'nota',
    title: 'Conteo cíclico registrado',
    description: 'Cantidad física coincide con sistema.',
    when: 'Hoy, 08:30',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'email',
    title: 'Alerta stock bajo enviada',
    when: 'Ayer, 17:00',
    createdAt: '15 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'llamada',
    title: 'Coordinación reposición con compras',
    when: '10 may, 11:15',
    createdAt: '10 may 2024',
    author: 'Ana Ruiz',
  },
]

export function inventoryRelatedIds(inventory: { id: string }): Set<string> {
  const ids = new Set<string>([inventory.id])
  const pageMatch = /^inventario-(\d+)$/.exec(inventory.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = inventoryListSeed[idx % inventoryListSeed.length]
    if (seed) ids.add(seed.id)
  }
  return ids
}

export function buildInventoryActivitiesForDetail(
  inventory: InventoryListItem,
): ContactActivity[] {
  const ids = inventoryRelatedIds(inventory)
  return buildEntityActivitiesForDetail({
    relatedType: 'inventario',
    entityId: inventory.id,
    relatedName: inventory.productName,
    companyName: inventory.sku,
    relatedIds: ids,
    matchExtra: (a) =>
      a.relatedName === inventory.productName || a.relatedName === inventory.sku,
    templates: activityTemplates,
    seedRecordFilter: (a) => a.relatedType === 'inventario',
  })
}

export function inventoryFormToCreateValues(
  inventoryId: string,
  productName: string,
  sku: string,
  form: ActivityFormPayload,
) {
  return entityFormToCreateValues('inventario', inventoryId, productName, sku, form)
}
