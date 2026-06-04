import { activityListSeed } from '@/data/activities.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import { companyListSeed } from '@/data/companies.mock'
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
    title: 'Revisión trimestral de cuenta',
    description: 'Alineación de roadmap y renovación de licencias.',
    when: 'Hoy, 11:00',
    createdAt: '16 may 2024',
    author: 'María López',
  },
  {
    type: 'email',
    title: 'Propuesta comercial enviada',
    description: 'Adjunto PDF con pricing anual y condiciones de implementación.',
    when: 'Ayer, 16:45',
    createdAt: '15 may 2024',
    author: 'María López',
  },
  {
    type: 'llamada',
    title: 'Discovery con equipo de compras',
    description: 'Validación de stakeholders y calendario de piloto.',
    when: '12 may, 11:00',
    createdAt: '10 may 2024',
    author: 'Carlos Vega',
  },
  {
    type: 'whatsapp',
    title: 'Confirmación de reunión',
    when: '10 may, 09:15',
    createdAt: '9 may 2024',
    author: 'María López',
  },
  {
    type: 'nota',
    title: 'Interés en módulo BI',
    description: 'Mencionó necesidad de reportes ejecutivos para Q3.',
    when: '8 may, 14:20',
    createdAt: '8 may 2024',
    author: 'Ana Ruiz',
  },
]

export function companyRelatedIds(company: { id: string }): Set<string> {
  const ids = new Set<string>([company.id])

  const pageMatch = /^empresas-(\d+)$/.exec(company.id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = companyListSeed[idx]
    if (seed) ids.add(seed.id)
  }

  const coMatch = /^co(\d+)$/.exec(company.id)
  if (coMatch) {
    const n = Number.parseInt(coMatch[1] ?? '1', 10)
    ids.add(`empresas-${n - 1}`)
  }

  return ids
}

export function activitiesForCompany(
  all: ActivityListItem[],
  company: CompanyListItem,
): ContactActivity[] {
  const ids = companyRelatedIds(company)
  return all
    .filter(
      (a) =>
        a.relatedType === 'empresa' &&
        (ids.has(a.relatedId) || a.relatedName === company.name),
    )
    .map((item) => listItemToContactActivity(item))
}

function timelineTemplates(companyId: string): ContactActivity[] {
  return activityTemplates.map((t, i) => ({
    ...t,
    id: `co-act-${companyId}-${i}`,
    status: templateStatuses[i % templateStatuses.length]!,
    priority: templatePriorities[i % templatePriorities.length]!,
  }))
}

/** IDs de actividades del módulo para enlazar filas demo del timeline. */
function demoActivityRecordIds(
  company: CompanyListItem,
  all: ActivityListItem[],
): string[] {
  const ids = companyRelatedIds(company)
  const forCompany = all.filter(
    (a) =>
      a.relatedType === 'empresa' &&
      (ids.has(a.relatedId) || a.relatedName === company.name),
  )
  if (forCompany.length > 0) return forCompany.map((a) => a.id)

  return activityListSeed
    .filter((a) => a.relatedType === 'empresa')
    .map((a) => a.id)
}

function timelineTemplatesWithRecordIds(
  company: CompanyListItem,
  recordIds: string[],
): ContactActivity[] {
  const templates = timelineTemplates(company.id)
  const all = [...getRegistryActivities(), ...activityListSeed]

  if (recordIds.length === 0) {
    return templates.map((t) => ({
      ...t,
      relatedType: 'empresa' as const,
      relatedId: company.id,
      relatedName: company.name,
      companyName: company.name,
    }))
  }

  return templates.map((activity, index) => {
    const recordId = recordIds[index % recordIds.length]!
    const seed = all.find((a) => a.id === recordId)
    return {
      ...activity,
      recordId,
      relatedType: seed?.relatedType ?? ('empresa' as const),
      relatedId: seed?.relatedId ?? company.id,
      relatedName: seed?.relatedName ?? company.name,
      companyName: seed?.companyName ?? company.name,
    }
  })
}

export function buildCompanyActivitiesForDetail(
  company: CompanyListItem,
): ContactActivity[] {
  const all = [...getRegistryActivities(), ...activityListSeed]
  const linked = activitiesForCompany(all, company)
  const recordPool = demoActivityRecordIds(company, all)
  const templates = timelineTemplatesWithRecordIds(company, recordPool)

  const linkedRecordIds = new Set(
    linked.map((a) => a.recordId).filter((id): id is string => Boolean(id)),
  )

  const extraTemplates = templates.filter(
    (t) => !t.recordId || !linkedRecordIds.has(t.recordId),
  )

  return [...linked, ...extraTemplates]
}

export function companyFormToCreateValues(
  companyId: string,
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
    relatedType: 'empresa' as const,
    relatedName: companyName,
    companyName,
    scheduledAt: form.scheduledAt,
    assigneeName: form.author,
    priority: form.priority,
    status: form.status,
    relatedId: companyId,
    durationMinutes: defaultDurationFieldForType(form.type),
    reminderPreset: form.reminderPreset,
    reminderCustomAt: form.reminderCustomAt,
  }
}
