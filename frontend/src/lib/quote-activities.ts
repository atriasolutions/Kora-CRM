import { activityListSeed } from '@/data/activities.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { quoteListSeed } from '@/data/quotes.mock'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import { getRegistryActivities } from '@/data/activities-registry-store'
import type { ActivityReminderFormFields } from '@/lib/activity-reminder'
import { defaultDurationFieldForType } from '@/lib/entity-activity-form'
import { listItemToContactActivity } from '@/lib/contact-activities'

const templateStatuses = ['Pendiente', 'Completada', 'En curso', 'Completada', 'Pendiente'] as const
const templatePriorities = ['Alta', 'Media', 'Media', 'Baja', 'Media'] as const

const activityTemplates: Omit<
  ContactActivity,
  'id' | 'recordId' | 'status' | 'priority'
>[] = [
  {
    type: 'email',
    title: 'Cotización enviada al cliente',
    description: 'PDF adjunto con condiciones comerciales.',
    when: '14 may, 10:20',
    createdAt: '14 may 2024',
    author: 'María López',
  },
  {
    type: 'reunion',
    title: 'Revisión de alcance con compras',
    description: 'Ajuste de líneas de servicio e implementación.',
    when: '13 may, 16:00',
    createdAt: '13 may 2024',
    author: 'María López',
  },
  {
    type: 'llamada',
    title: 'Seguimiento post-envío',
    when: '12 may, 11:00',
    createdAt: '12 may 2024',
    author: 'Carlos Vega',
  },
]

export function quoteRelatedIds(quote: { id: string }): Set<string> {
  const ids = new Set<string>([quote.id])
  const pageMatch = /^cotizaciones-(\d+)$/.exec(quote.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = quoteListSeed[idx]
    if (seed) ids.add(seed.id)
  }
  const qtMatch = /^qt(\d+)$/.exec(quote.id)
  if (qtMatch) {
    const n = Number.parseInt(qtMatch[1] ?? '1', 10)
    ids.add(`cotizaciones-${n - 1}`)
  }
  return ids
}

export function activitiesForQuote(
  all: ActivityListItem[],
  quote: QuoteListItem,
): ContactActivity[] {
  const ids = quoteRelatedIds(quote)
  return all
    .filter(
      (a) =>
        a.relatedType === 'cotizacion' &&
        (ids.has(a.relatedId) || a.relatedName === quote.code),
    )
    .map((item) => listItemToContactActivity(item))
}

function demoActivityRecordIds(quote: QuoteListItem, all: ActivityListItem[]): string[] {
  const ids = quoteRelatedIds(quote)
  const forQuote = all.filter(
    (a) =>
      a.relatedType === 'cotizacion' &&
      (ids.has(a.relatedId) || a.relatedName === quote.code),
  )
  if (forQuote.length > 0) return forQuote.map((a) => a.id)
  return activityListSeed.filter((a) => a.relatedType === 'cotizacion').map((a) => a.id)
}

function timelineTemplates(quoteId: string, recordIds: string[]): ContactActivity[] {
  return activityTemplates.map((t, i) => ({
    ...t,
    id: `qt-act-${quoteId}-${i}`,
    recordId: recordIds[i % recordIds.length],
    status: templateStatuses[i % templateStatuses.length]!,
    priority: templatePriorities[i % templatePriorities.length]!,
  }))
}

export function buildQuoteActivitiesForDetail(quote: QuoteListItem): ContactActivity[] {
  const all = [...getRegistryActivities(), ...activityListSeed]
  const linked = activitiesForQuote(all, quote)
  const recordPool = demoActivityRecordIds(quote, all)
  const linkedRecordIds = new Set(
    linked.map((a) => a.recordId).filter((id): id is string => Boolean(id)),
  )
  const templates = timelineTemplates(quote.id, recordPool).filter(
    (t) => !t.recordId || !linkedRecordIds.has(t.recordId),
  )
  return [...linked, ...templates]
}

export function quoteFormToCreateValues(
  quoteId: string,
  quoteCode: string,
  companyName: string,
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
    relatedType: 'cotizacion' as const,
    relatedName: quoteCode,
    companyName,
    scheduledAt: form.scheduledAt,
    assigneeName: form.author,
    priority: form.priority,
    status: form.status,
    relatedId: quoteId,
    durationMinutes: defaultDurationFieldForType(form.type),
    reminderPreset: form.reminderPreset,
    reminderCustomAt: form.reminderCustomAt,
  }
}
