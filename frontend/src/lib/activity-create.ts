import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type {
  ActivityListItem,
  ActivityPriority,
  ActivityRelatedType,
  ActivityStatus,
} from '@/data/activities.mock'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import {
  activityTypeLabel,
  formatActivityWhenLabel,
  toDatetimeLocalValue,
} from '@/lib/contact-activity'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import {
  defaultActivityReminderFields,
  formatReminderLabel,
  reminderAtIsoFromForm,
  validateActivityReminder,
  type ActivityReminderFormFields,
} from '@/lib/activity-reminder'

export type CreateActivityFormValues = {
  title: string
  type: ContactActivityType
  relatedType: ActivityRelatedType
  relatedId?: string
  relatedName: string
  companyName: string
  scheduledAt: string
  durationMinutes: string
  assigneeName: string
  priority: ActivityPriority
  status: ActivityStatus
  description?: string
  interactionKind?: 'outreach' | 'scheduled'
  outreachResult?: import('@/lib/contact-outreach').ContactOutreachResult
} & ActivityReminderFormFields

export function defaultDurationMinutesForType(type: ContactActivityType): number {
  switch (type) {
    case 'reunion':
      return 60
    case 'llamada':
      return 30
    case 'email':
    case 'whatsapp':
    case 'nota':
      return 15
    default:
      return 30
  }
}

export function formatDurationMinutesForInput(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  return String(Math.floor(value))
}

export function parseDurationMinutes(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

function reminderFieldsFromActivity(activity: ActivityDetail): ActivityReminderFormFields {
  if (activity.reminderPreset) {
    return {
      reminderPreset: activity.reminderPreset,
      reminderCustomAt: activity.reminderCustomAt?.trim()
        ? activity.reminderCustomAt
        : toDatetimeLocalValue(),
    }
  }

  const label = activity.reminder?.trim().toLowerCase() ?? ''
  if (!label || label.includes('sin recordatorio')) {
    return { reminderPreset: 'none', reminderCustomAt: toDatetimeLocalValue() }
  }
  if (label.includes('15 min')) {
    return { reminderPreset: '15min', reminderCustomAt: toDatetimeLocalValue() }
  }
  if (label.includes('30 min')) {
    return { reminderPreset: '30min', reminderCustomAt: toDatetimeLocalValue() }
  }
  if (label.includes('1 hora') || label.includes('una hora')) {
    return { reminderPreset: '1h', reminderCustomAt: toDatetimeLocalValue() }
  }
  if (label.includes('1 día') || label.includes('un día')) {
    return { reminderPreset: '1d', reminderCustomAt: toDatetimeLocalValue() }
  }
  if (label.includes('personalizado') && activity.reminderAt?.trim()) {
    const date = new Date(activity.reminderAt)
    if (!Number.isNaN(date.getTime())) {
      return {
        reminderPreset: 'custom',
        reminderCustomAt: toDatetimeLocalValue(date),
      }
    }
  }
  return defaultActivityReminderFields()
}

function scheduledAtForForm(activity: ActivityDetail): string {
  const raw = activity.scheduledAt?.trim()
  if (raw && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw
  return toDatetimeLocalValue()
}

export function createDefaultActivityFormValues(
  partial?: Partial<CreateActivityFormValues>,
): CreateActivityFormValues {
  const type = partial?.type ?? 'llamada'
  return {
    title: '',
    type,
    relatedType: 'contacto',
    relatedId: '',
    relatedName: '',
    companyName: '',
    scheduledAt: toDatetimeLocalValue(),
    durationMinutes:
      partial?.durationMinutes ??
      formatDurationMinutesForInput(defaultDurationMinutesForType(type)),
    assigneeName: getDefaultOwnerName(),
    priority: 'Media',
    status: 'Pendiente',
    ...defaultActivityReminderFields(),
    ...partial,
  }
}

export function activityDetailToCreateFormValues(
  activity: ActivityDetail,
): CreateActivityFormValues {
  return {
    title: activity.title,
    type: activity.type,
    relatedType: activity.relatedType,
    relatedId: activity.relatedId,
    relatedName: activity.relatedName,
    companyName: activity.companyName,
    scheduledAt: scheduledAtForForm(activity),
    durationMinutes: formatDurationMinutesForInput(
      activity.durationMinutes ?? defaultDurationMinutesForType(activity.type),
    ),
    assigneeName: activity.assignee,
    priority: activity.priority,
    status: activity.status,
    ...reminderFieldsFromActivity(activity),
  }
}

export function applyCreateFormValuesToActivity(
  activity: ActivityDetail,
  values: CreateActivityFormValues,
): ActivityDetail {
  const durationMinutes =
    parseDurationMinutes(values.durationMinutes) ??
    activity.durationMinutes ??
    defaultDurationMinutesForType(values.type)

  return {
    ...activity,
    title: values.title.trim(),
    type: values.type,
    typeLabel: activityTypeLabel(values.type),
    relatedType: values.relatedType,
    relatedId: values.relatedId?.trim() || activity.relatedId,
    relatedName: values.relatedName.trim(),
    companyName: values.companyName.trim() || values.relatedName.trim(),
    scheduledAt: values.scheduledAt,
    due: formatActivityWhenLabel(values.scheduledAt),
    durationMinutes,
    assignee: values.assigneeName.trim(),
    status: values.status,
    priority: values.priority,
    reminder: formatReminderLabel(values.reminderPreset, values.reminderCustomAt),
    reminderAt: reminderAtIsoFromForm(values.scheduledAt, values),
    reminderPreset: values.reminderPreset,
    reminderCustomAt: values.reminderCustomAt,
    completedAt:
      values.status === 'Completada'
        ? activity.completedAt ?? 'Recién completada'
        : undefined,
  }
}

export function duplicateActivityFormValues(
  source: ActivityListItem,
): CreateActivityFormValues {
  return {
    title: `${source.title.replace(/ \(copia\)$/i, '')} (copia)`,
    type: source.type,
    relatedType: source.relatedType,
    relatedId: source.relatedId,
    relatedName: source.relatedName,
    companyName: source.companyName,
    scheduledAt: toDatetimeLocalValue(),
    durationMinutes: formatDurationMinutesForInput(
      defaultDurationMinutesForType(source.type),
    ),
    assigneeName: source.assignee,
    priority: source.priority,
    status: 'Pendiente',
    ...defaultActivityReminderFields(),
  }
}

export function validateCreateActivityForm(values: CreateActivityFormValues): string | null {
  if (!values.title.trim()) return 'El título es obligatorio.'
  if (!values.relatedId?.trim()) return 'Selecciona el registro al que vincular la actividad.'
  if (parseDurationMinutes(values.durationMinutes) == null) {
    return 'Indica la duración estimada en minutos (entero mayor a cero).'
  }
  return validateActivityReminder(values)
}

export function createActivityId(): string {
  return `activity-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToListItem(
  values: CreateActivityFormValues,
  id = createActivityId(),
): ActivityListItem {
  const due = formatActivityWhenLabel(values.scheduledAt)
  return stampRecordAuditOnCreate({
    id,
    title: values.title.trim(),
    type: values.type,
    typeLabel: activityTypeLabel(values.type),
    relatedType: values.relatedType,
    relatedId: values.relatedId!.trim(),
    relatedName: values.relatedName.trim(),
    companyName: values.companyName?.trim() || values.relatedName.trim(),
    due,
    scheduledAt: values.scheduledAt,
    reminderAt: reminderAtIsoFromForm(values.scheduledAt, values),
    reminderPreset: values.reminderPreset,
    reminderCustomAt: values.reminderCustomAt,
    assignee: values.assigneeName.trim(),
    status: values.status,
    priority: values.priority,
    reminder: formatReminderLabel(values.reminderPreset, values.reminderCustomAt),
    description: values.description?.trim() || undefined,
    interactionKind: values.interactionKind,
    outreachResult: values.outreachResult,
  })
}
