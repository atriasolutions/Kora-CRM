import { stockReceiptListSeed, type StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { buildEntityActivitiesForDetail } from '@/lib/entity-activity-build'
import { entityFormToCreateValues, type ActivityFormPayload } from '@/lib/entity-activity-form'

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'email',
    title: 'Confirmación de recepción en bodega',
    description: 'Guía de despacho y cantidades validadas.',
    when: 'Hoy, 09:15',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'nota',
    title: 'Diferencia de cantidad en línea',
    description: 'Se registró ajuste menor en segunda línea del ingreso.',
    when: 'Ayer, 14:20',
    createdAt: '15 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'llamada',
    title: 'Coordinación con compras',
    when: '10 may, 11:00',
    createdAt: '10 may 2024',
    author: 'Ana Ruiz',
  },
]

export function stockReceiptRelatedIds(receipt: { id: string }): Set<string> {
  const ids = new Set<string>([receipt.id])
  const pageMatch = /^ingresos-(\d+)$/.exec(receipt.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = stockReceiptListSeed[idx % stockReceiptListSeed.length]
    if (seed) ids.add(seed.id)
  }
  return ids
}

export function buildStockReceiptActivitiesForDetail(
  receipt: StockReceiptListItem,
): ContactActivity[] {
  const ids = stockReceiptRelatedIds(receipt)
  return buildEntityActivitiesForDetail({
    relatedType: 'ingreso',
    entityId: receipt.id,
    relatedName: receipt.number,
    companyName: receipt.supplier,
    relatedIds: ids,
    matchExtra: (a) => a.relatedName === receipt.number,
    templates: activityTemplates.map((t) => ({
      ...t,
      author: t.author === 'María López' ? receipt.owner : t.author,
    })),
    seedRecordFilter: (a) => a.relatedType === 'ingreso',
  })
}

export function stockReceiptFormToCreateValues(
  receiptId: string,
  receiptNumber: string,
  warehouseName: string,
  form: ActivityFormPayload,
) {
  return entityFormToCreateValues('ingreso', receiptId, receiptNumber, warehouseName, form)
}
