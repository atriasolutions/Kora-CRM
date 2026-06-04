import type { ActivityListItem, ActivityRelatedType } from '@/data/activities.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import {
  defaultDurationMinutesForType,
  formatDurationMinutesForInput,
} from '@/lib/activity-create'
import type { ActivityReminderFormFields } from '@/lib/activity-reminder'

export type ActivityFormPayload = {
  type: ContactActivityType
  title: string
  description: string
  scheduledAt: string
  author: string
  priority: ActivityListItem['priority']
  status: ActivityListItem['status']
} & ActivityReminderFormFields

export function defaultDurationFieldForType(type: ContactActivityType): string {
  return formatDurationMinutesForInput(defaultDurationMinutesForType(type))
}

export function entityFormToCreateValues(
  relatedType: ActivityRelatedType,
  relatedId: string,
  relatedName: string,
  companyName: string,
  form: ActivityFormPayload,
) {
  return {
    title: form.title,
    type: form.type,
    relatedType,
    relatedName,
    companyName: companyName || relatedName,
    scheduledAt: form.scheduledAt,
    assigneeName: form.author,
    priority: form.priority,
    status: form.status,
    relatedId,
    durationMinutes: defaultDurationFieldForType(form.type),
    reminderPreset: form.reminderPreset,
    reminderCustomAt: form.reminderCustomAt,
  }
}
