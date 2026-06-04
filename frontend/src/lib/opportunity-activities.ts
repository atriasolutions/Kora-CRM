import { activityListSeed } from '@/data/activities.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { opportunityListSeed } from '@/data/opportunities.mock'
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
    type: 'reunion',
    title: 'Discovery con stakeholders',
    description: 'Validación de necesidades y calendario de piloto.',
    when: 'Hoy, 11:00',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'email',
    title: 'Propuesta comercial enviada',
    when: 'Ayer, 16:45',
    createdAt: '15 may 2024',
    author: 'María López',
  },
  {
    type: 'llamada',
    title: 'Seguimiento comité de compras',
    when: '12 may, 11:00',
    createdAt: '10 may 2024',
    author: 'Carlos Vega',
  },
]

export function opportunityRelatedIds(opportunity: { id: string }): Set<string> {
  const ids = new Set<string>([opportunity.id])
  const pageMatch = /^oportunidades-(\d+)$/.exec(opportunity.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = opportunityListSeed[idx]
    if (seed) ids.add(seed.id)
  }
  const opMatch = /^op(\d+)$/.exec(opportunity.id)
  if (opMatch) {
    const n = Number.parseInt(opMatch[1] ?? '1', 10)
    ids.add(`oportunidades-${n - 1}`)
  }
  return ids
}

export function activitiesForOpportunity(
  all: ActivityListItem[],
  opportunity: OpportunityListItem,
): ContactActivity[] {
  const ids = opportunityRelatedIds(opportunity)
  return all
    .filter(
      (a) =>
        a.relatedType === 'oportunidad' &&
        (ids.has(a.relatedId) || a.relatedName === opportunity.name),
    )
    .map((item) => listItemToContactActivity(item))
}

function demoActivityRecordIds(
  opportunity: OpportunityListItem,
  all: ActivityListItem[],
): string[] {
  const ids = opportunityRelatedIds(opportunity)
  const forOpp = all.filter(
    (a) =>
      a.relatedType === 'oportunidad' &&
      (ids.has(a.relatedId) || a.relatedName === opportunity.name),
  )
  if (forOpp.length > 0) return forOpp.map((a) => a.id)
  return activityListSeed.filter((a) => a.relatedType === 'oportunidad').map((a) => a.id)
}

function timelineTemplates(oppId: string, recordIds: string[]): ContactActivity[] {
  return activityTemplates.map((t, i) => ({
    ...t,
    id: `opp-act-${oppId}-${i}`,
    recordId: recordIds[i % recordIds.length],
    status: templateStatuses[i % templateStatuses.length]!,
    priority: templatePriorities[i % templatePriorities.length]!,
  }))
}

export function buildOpportunityActivitiesForDetail(
  opportunity: OpportunityListItem,
): ContactActivity[] {
  const all = [...getRegistryActivities(), ...activityListSeed]
  const linked = activitiesForOpportunity(all, opportunity)
  const recordPool = demoActivityRecordIds(opportunity, all)
  const linkedRecordIds = new Set(
    linked.map((a) => a.recordId).filter((id): id is string => Boolean(id)),
  )
  const templates = timelineTemplates(opportunity.id, recordPool).filter(
    (t) => !t.recordId || !linkedRecordIds.has(t.recordId),
  )
  return [...linked, ...templates]
}

export function opportunityFormToCreateValues(
  opportunityId: string,
  opportunityName: string,
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
    relatedType: 'oportunidad' as const,
    relatedName: opportunityName,
    companyName,
    scheduledAt: form.scheduledAt,
    assigneeName: form.author,
    priority: form.priority,
    status: form.status,
    relatedId: opportunityId,
    durationMinutes: defaultDurationFieldForType(form.type),
    reminderPreset: form.reminderPreset,
    reminderCustomAt: form.reminderCustomAt,
  }
}
