import type { ActivityPriority, ActivityStatus } from '@/data/activities.mock'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import { defaultActivityReminderFields, type ActivityReminderFormFields } from '@/lib/activity-reminder'
import {
  activityTypeLabel,
  defaultActivityTitle,
} from '@/lib/activity-type-label'
import { getCurrentUserName } from '@/lib/current-user'
import { toDatetimeLocalValue } from '@/lib/datetime-local'
import { listItemToContactActivity } from '@/lib/contact-activities'

export { activityTypeLabel, defaultActivityTitle, toDatetimeLocalValue }

export type ActivityFormValues = {
  type: ContactActivityType
  title: string
  description: string
  scheduledAt: string
  author: string
  priority: ActivityPriority
  status: ActivityStatus
} & ActivityReminderFormFields

export const ACTIVITY_TYPE_OPTIONS: {
  value: ContactActivityType
  label: string
}[] = [
  { value: 'llamada', label: 'Llamada' },
  { value: 'email', label: 'Email' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'nota', label: 'Nota' },
]

export function formatActivityWhenLabel(isoLocal: string): string {
  const date = new Date(isoLocal)
  if (Number.isNaN(date.getTime())) return 'Recién'

  const now = new Date()
  const time = date.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return `Hoy, ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${time}`
  }

  const datePart = date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
  })
  return `${datePart}, ${time}`
}

export function createDefaultActivityForm(
  author: string,
  presetType: ContactActivityType = 'llamada',
): ActivityFormValues {
  return {
    type: presetType,
    title: defaultActivityTitle(presetType),
    description: '',
    scheduledAt: toDatetimeLocalValue(),
    author: author.trim() || getCurrentUserName(),
    priority: 'Media',
    status: 'Pendiente',
    ...defaultActivityReminderFields(),
  }
}

export function contactActivityFromListItem(
  item: ActivityListItem,
  description?: string,
): ContactActivity {
  const base = listItemToContactActivity(item)
  return {
    ...base,
    description: description?.trim() || base.description,
  }
}

export function lastContactLabelFromActivity(activity: ContactActivity): string {
  const whenPart = activity.when.split('·')[0]?.trim() ?? activity.when
  return `${whenPart} · ${activityTypeLabel(activity.type)}`
}
