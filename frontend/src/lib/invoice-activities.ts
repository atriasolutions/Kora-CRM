import { invoiceListSeed, type InvoiceListItem } from '@/data/invoices.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { buildEntityActivitiesForDetail } from '@/lib/entity-activity-build'
import { entityFormToCreateValues, type ActivityFormPayload } from '@/lib/entity-activity-form'

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'email',
    title: 'Factura enviada al cliente',
    description: 'PDF y XML enviados a facturación del cliente.',
    when: 'Hoy, 10:30',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'llamada',
    title: 'Seguimiento de cobro',
    description: 'Confirmación de recepción y fecha de pago.',
    when: 'Ayer, 15:00',
    createdAt: '15 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'nota',
    title: 'Observación de cobranza',
    description: 'Cliente solicitó extensión de 15 días.',
    when: '12 may, 11:20',
    createdAt: '12 may 2024',
    author: 'Ana Ruiz',
  },
]

export function invoiceRelatedIds(invoice: { id: string }): Set<string> {
  const ids = new Set<string>([invoice.id])
  const pageMatch = /^facturacion-(\d+)$/.exec(invoice.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = invoiceListSeed[idx % invoiceListSeed.length]
    if (seed) ids.add(seed.id)
  }
  return ids
}

export function buildInvoiceActivitiesForDetail(
  invoice: InvoiceListItem,
): ContactActivity[] {
  const ids = invoiceRelatedIds(invoice)
  return buildEntityActivitiesForDetail({
    relatedType: 'factura',
    entityId: invoice.id,
    relatedName: invoice.number,
    companyName: invoice.client,
    relatedIds: ids,
    matchExtra: (a) => a.relatedName === invoice.number || a.relatedName === invoice.client,
    templates: activityTemplates.map((t) => ({
      ...t,
      author: t.author === 'María López' ? invoice.owner : t.author,
    })),
    seedRecordFilter: (a) => a.relatedType === 'factura',
  })
}

export function invoiceFormToCreateValues(
  invoiceId: string,
  invoiceNumber: string,
  clientName: string,
  form: ActivityFormPayload,
) {
  return entityFormToCreateValues('factura', invoiceId, invoiceNumber, clientName, form)
}
