import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { defaultDurationMinutesForType } from '@/lib/activity-create'
import { resolveActivityReminderLabel } from '@/lib/activity-reminder'

export function normalizeDurationMinutes(
  value: number | undefined | null,
  type: ContactActivityType,
): number {
  if (value != null && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  return defaultDurationMinutesForType(type)
}

export function normalizeActivityDetail(
  raw: Partial<ActivityDetail> & ActivityListItem,
): ActivityDetail {
  const type = raw.type
  return {
    ...raw,
    id: raw.id,
    description: raw.description ?? '',
    scheduledAt: raw.scheduledAt ?? raw.due ?? '',
    durationMinutes: normalizeDurationMinutes(raw.durationMinutes, type),
    location: raw.location ?? '',
    outcome: raw.outcome ?? '',
    tags: raw.tags ?? [],
    statusHistory: raw.statusHistory ?? [],
    notes: raw.notes ?? [],
    reminder: resolveActivityReminderLabel(raw),
  }
}
