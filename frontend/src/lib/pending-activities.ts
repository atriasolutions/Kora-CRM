import type {
  ActivityListItem,
  ActivityPriority,
  ActivityStatus,
} from '@/data/activities.mock'
import {
  computeReminderAtMs,
  type ActivityReminderFormFields,
  type ActivityReminderPreset,
} from '@/lib/activity-reminder'
import { getCurrentUser } from '@/lib/current-user'

const PRIORITY_RANK: Record<ActivityPriority, number> = {
  Alta: 0,
  Media: 1,
  Baja: 2,
}

const SPANISH_MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
}

const DEFAULT_REMINDER_OFFSET_MS = 60 * 60 * 1000

export function isPendingActivityStatus(status: ActivityStatus): boolean {
  return status === 'Pendiente' || status === 'En curso'
}

/** Interpreta etiquetas como «Hoy, 14:30» o «12 may, 09:00» respecto a `now`. */
export function parseActivityDueLabel(due: string, now = new Date()): number | null {
  const trimmed = due.trim()

  const hoyMatch = /^Hoy,\s*(\d{1,2}):(\d{2})$/i.exec(trimmed)
  if (hoyMatch) {
    const d = new Date(now)
    d.setHours(Number(hoyMatch[1]), Number(hoyMatch[2]), 0, 0)
    return d.getTime()
  }

  const mananaMatch = /^Mañana,\s*(\d{1,2}):(\d{2})$/i.exec(trimmed)
  if (mananaMatch) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    d.setHours(Number(mananaMatch[1]), Number(mananaMatch[2]), 0, 0)
    return d.getTime()
  }

  const datedMatch = /^(\d{1,2})\s+([a-záéíóúñ]+),?\s*(\d{1,2}):(\d{2})$/i.exec(trimmed)
  if (datedMatch) {
    const day = Number(datedMatch[1])
    const monthKey = datedMatch[2]!.toLowerCase().replace('.', '').slice(0, 3)
    const month = SPANISH_MONTHS[monthKey]
    if (month === undefined) return null
    const d = new Date(
      now.getFullYear(),
      month,
      day,
      Number(datedMatch[3]),
      Number(datedMatch[4]),
      0,
      0,
    )
    return d.getTime()
  }

  return null
}

function reminderOffsetFromLabel(reminder?: string): number | null {
  if (!reminder?.trim()) return null
  const text = reminder.toLowerCase()
  if (text.includes('15 min')) return 15 * 60 * 1000
  if (text.includes('30 min')) return 30 * 60 * 1000
  if (text.includes('1 hora') || text.includes('1 h')) return 60 * 60 * 1000
  if (text.includes('1 día') || text.includes('1 dia')) return 24 * 60 * 60 * 1000
  if (text.includes('personalizado')) {
    const afterDot = reminder.split('·')[1]?.trim()
    if (afterDot) {
      const parsed = new Date(afterDot)
      if (!Number.isNaN(parsed.getTime())) return null
    }
  }
  return null
}

/** Timestamp programado de la actividad (ISO o etiqueta «due»). */
export function getActivityScheduledTimestamp(activity: ActivityListItem): number | null {
  return scheduledTimestamp(activity)
}

function scheduledTimestamp(activity: ActivityListItem): number | null {
  if (activity.scheduledAt) {
    const t = new Date(activity.scheduledAt).getTime()
    if (!Number.isNaN(t)) return t
  }
  return parseActivityDueLabel(activity.due)
}

function reminderFieldsFromActivity(
  activity: ActivityListItem,
): ActivityReminderFormFields | null {
  if (activity.reminderPreset) {
    return {
      reminderPreset: activity.reminderPreset,
      reminderCustomAt: activity.reminderCustomAt ?? '',
    }
  }
  return null
}

/** Timestamp del recordatorio para ordenar y mostrar en el panel lateral. */
export function resolveActivityReminderAt(activity: ActivityListItem): number {
  if (activity.reminderAt) {
    const stored = new Date(activity.reminderAt).getTime()
    if (!Number.isNaN(stored)) return stored
  }

  const fields = reminderFieldsFromActivity(activity)
  if (fields && activity.scheduledAt) {
    const computed = computeReminderAtMs(activity.scheduledAt, fields)
    if (computed != null) return computed
  }

  if (activity.reminderPreset === 'none') {
    return Number.MAX_SAFE_INTEGER
  }

  const scheduled = scheduledTimestamp(activity)
  if (scheduled == null) return Number.MAX_SAFE_INTEGER

  const offset = reminderOffsetFromLabel(activity.reminder) ?? DEFAULT_REMINDER_OFFSET_MS
  return scheduled - offset
}

export function formatReminderWhenLabel(timestampMs: number, now = new Date()): string {
  const date = new Date(timestampMs)
  const time = date.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (date.toDateString() === now.toDateString()) {
    return `Hoy, ${time}`
  }

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Mañana, ${time}`
  }

  const datePart = date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
  })
  return `${datePart}, ${time}`
}

export function activityAssignedToUser(
  activity: ActivityListItem,
  userName = getCurrentUser().name,
): boolean {
  const assignee = activity.assignee?.trim().toLowerCase() ?? ''
  const mine = userName.trim().toLowerCase()
  return Boolean(assignee && mine && assignee === mine)
}

export function sortPendingActivitiesByDue(
  activities: ActivityListItem[],
): ActivityListItem[] {
  return [...activities].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    const dueA = scheduledTimestamp(a) ?? Number.MAX_SAFE_INTEGER
    const dueB = scheduledTimestamp(b) ?? Number.MAX_SAFE_INTEGER
    return dueA - dueB
  })
}

export function sortPendingActivitiesByReminder(
  activities: ActivityListItem[],
): ActivityListItem[] {
  return [...activities].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return resolveActivityReminderAt(a) - resolveActivityReminderAt(b)
  })
}

/** True cuando ya llegó el momento del recordatorio (p. ej. «1 h antes» de la actividad). */
export function isActivityReminderDue(
  activity: ActivityListItem,
  now: Date = new Date(),
): boolean {
  if (activity.reminderPreset === 'none') return false
  const reminderAt = resolveActivityReminderAt(activity)
  if (reminderAt >= Number.MAX_SAFE_INTEGER) return false
  return reminderAt <= now.getTime()
}

export function selectPendingActivitiesForPanel(
  activities: ActivityListItem[],
  _now: Date = new Date(),
): ActivityListItem[] {
  return sortPendingActivitiesByDue(
    activities.filter((activity) => {
      if (!isPendingActivityStatus(activity.status)) return false
      return activityAssignedToUser(activity)
    }),
  )
}

/** Actividades con recordatorio ya vencido (para sonido de aviso). */
export function selectReminderDueActivities(
  activities: ActivityListItem[],
  now: Date = new Date(),
): ActivityListItem[] {
  return activities.filter(
    (activity) =>
      isPendingActivityStatus(activity.status) && isActivityReminderDue(activity, now),
  )
}

export type { ActivityReminderPreset }
