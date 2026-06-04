import { activityListSeed } from '@/data/activities.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { purchaseListSeed } from '@/data/purchases.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { getRegistryActivities } from '@/data/activities-registry-store'
import type { ActivityReminderFormFields } from '@/lib/activity-reminder'
import { defaultDurationFieldForType } from '@/lib/entity-activity-form'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { listItemToContactActivity } from '@/lib/contact-activities'

const templateStatuses = ['Pendiente', 'Completada', 'En curso', 'Completada', 'Pendiente'] as const
const templatePriorities = ['Alta', 'Media', 'Media', 'Baja', 'Media'] as const

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'email',
    title: 'Confirmación de orden al proveedor',
    description: 'Se envió OC firmada y condiciones de pago.',
    when: 'Hoy, 09:15',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'llamada',
    title: 'Seguimiento de entrega',
    description: 'Consulta por fecha de despacho y guía de transporte.',
    when: 'Ayer, 15:40',
    createdAt: '15 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'reunion',
    title: 'Revisión de recepción parcial',
    description: 'Validación de cantidades recibidas vs. líneas de la OC.',
    when: '8 may, 11:00',
    createdAt: '10 may 2024',
    author: 'Ana Ruiz',
  },
  {
    type: 'nota',
    title: 'Ajuste de precio unitario',
    description: 'Proveedor confirmó descuento por volumen en segunda línea.',
    when: '5 may, 14:20',
    createdAt: '5 may 2024',
    author: 'María López',
  },
]

export function purchaseRelatedIds(purchase: { id: string }): Set<string> {
  const ids = new Set<string>([purchase.id])

  const pageMatch = /^compras-(\d+)$/.exec(purchase.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = purchaseListSeed[idx % purchaseListSeed.length]
    if (seed) ids.add(seed.id)
  }

  return ids
}

export function activitiesForPurchase(
  all: ActivityListItem[],
  purchase: PurchaseListItem,
): ContactActivity[] {
  const ids = purchaseRelatedIds(purchase)
  return all
    .filter(
      (a) =>
        a.relatedType === 'compra' &&
        (ids.has(a.relatedId) ||
          a.relatedName === purchase.reference ||
          a.relatedName === purchase.supplier),
    )
    .map((item) => listItemToContactActivity(item))
}

function timelineTemplates(purchaseId: string): ContactActivity[] {
  return activityTemplates.map((t, i) => ({
    ...t,
    id: `pur-act-${purchaseId}-${i}`,
    status: templateStatuses[i % templateStatuses.length]!,
    priority: templatePriorities[i % templatePriorities.length]!,
  }))
}

function demoActivityRecordIds(
  purchase: PurchaseListItem,
  all: ActivityListItem[],
): string[] {
  const ids = purchaseRelatedIds(purchase)
  const forPurchase = all.filter(
    (a) =>
      a.relatedType === 'compra' &&
      (ids.has(a.relatedId) ||
        a.relatedName === purchase.reference ||
        a.relatedName === purchase.supplier),
  )
  if (forPurchase.length > 0) return forPurchase.map((a) => a.id)

  return activityListSeed
    .filter((a) => a.relatedType === 'compra')
    .map((a) => a.id)
}

function timelineTemplatesWithRecordIds(
  purchaseId: string,
  recordIds: string[],
): ContactActivity[] {
  const templates = timelineTemplates(purchaseId)
  if (recordIds.length === 0) return templates

  return templates.map((activity, index) => ({
    ...activity,
    recordId: recordIds[index % recordIds.length],
  }))
}

export function buildPurchaseActivitiesForDetail(
  purchase: PurchaseListItem,
): ContactActivity[] {
  const all = [...getRegistryActivities(), ...activityListSeed]
  const linked = activitiesForPurchase(all, purchase)
  const recordPool = demoActivityRecordIds(purchase, all)
  const templates = timelineTemplatesWithRecordIds(purchase.id, recordPool)

  const linkedRecordIds = new Set(
    linked.map((a) => a.recordId).filter((id): id is string => Boolean(id)),
  )

  const extraTemplates = templates.filter(
    (t) => !t.recordId || !linkedRecordIds.has(t.recordId),
  )

  return [...linked, ...extraTemplates]
}

export function purchaseFormToCreateValues(
  purchaseId: string,
  purchaseReference: string,
  supplierName: string,
  form: {
    type: ContactActivityType
    title: string
    description: string
    scheduledAt: string
    author: string
    priority: ActivityListItem['priority']
    status: ActivityListItem['status']
  } & ActivityReminderFormFields,
) {
  return {
    title: form.title,
    type: form.type,
    relatedType: 'compra' as const,
    relatedName: purchaseReference,
    companyName: supplierName || purchaseReference,
    scheduledAt: form.scheduledAt,
    assigneeName: form.author,
    priority: form.priority,
    status: form.status,
    relatedId: purchaseId,
    durationMinutes: defaultDurationFieldForType(form.type),
    reminderPreset: form.reminderPreset,
    reminderCustomAt: form.reminderCustomAt,
  }
}
