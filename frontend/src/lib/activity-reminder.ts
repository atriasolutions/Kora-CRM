import { toDatetimeLocalValue } from '@/lib/datetime-local'

export type ActivityReminderPreset =
  | 'none'
  | '15min'
  | '30min'
  | '1h'
  | '1d'
  | 'custom'

export type ActivityReminderFormFields = {
  reminderPreset: ActivityReminderPreset
  reminderCustomAt: string
}

export const ACTIVITY_REMINDER_PRESET_OPTIONS: {
  value: ActivityReminderPreset
  label: string
}[] = [
  { value: 'none', label: 'Sin recordatorio' },
  { value: '15min', label: '15 minutos antes' },
  { value: '30min', label: '30 minutos antes' },
  { value: '1h', label: '1 hora antes' },
  { value: '1d', label: '1 día antes' },
  { value: 'custom', label: 'Fecha personalizada' },
]

export function defaultActivityReminderFields(): ActivityReminderFormFields {
  return {
    reminderPreset: '1h',
    reminderCustomAt: toDatetimeLocalValue(),
  }
}

export function formatReminderLabel(
  preset: ActivityReminderPreset,
  customAt?: string,
): string {
  switch (preset) {
    case 'none':
      return 'Sin recordatorio'
    case '15min':
      return '15 minutos antes'
    case '30min':
      return '30 minutos antes'
    case '1h':
      return '1 hora antes'
    case '1d':
      return '1 día antes'
    case 'custom': {
      if (!customAt?.trim()) return 'Fecha personalizada'
      const date = new Date(customAt)
      if (Number.isNaN(date.getTime())) return 'Fecha personalizada'
      const when = date.toLocaleString('es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      return `Personalizado · ${when}`
    }
  }
}

const REMINDER_OFFSET_MS: Record<
  Exclude<ActivityReminderPreset, 'none' | 'custom'>,
  number
> = {
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
}

/** Momento en que debe dispararse el recordatorio (ms epoch), o null si no aplica. */
export function computeReminderAtMs(
  scheduledAt: string,
  fields: ActivityReminderFormFields,
): number | null {
  if (fields.reminderPreset === 'none') return null
  if (fields.reminderPreset === 'custom') {
    const date = new Date(fields.reminderCustomAt)
    return Number.isNaN(date.getTime()) ? null : date.getTime()
  }
  const scheduled = new Date(scheduledAt)
  if (Number.isNaN(scheduled.getTime())) return null
  return scheduled.getTime() - REMINDER_OFFSET_MS[fields.reminderPreset]
}

export function reminderAtIsoFromForm(
  scheduledAt: string,
  fields: ActivityReminderFormFields,
): string | undefined {
  const ms = computeReminderAtMs(scheduledAt, fields)
  return ms == null ? undefined : new Date(ms).toISOString()
}

export function validateActivityReminder(
  fields: ActivityReminderFormFields,
): string | null {
  if (fields.reminderPreset !== 'custom') return null
  if (!fields.reminderCustomAt.trim()) {
    return 'Indica la fecha y hora del recordatorio personalizado.'
  }
  const date = new Date(fields.reminderCustomAt)
  if (Number.isNaN(date.getTime())) {
    return 'La fecha del recordatorio no es válida.'
  }
  return null
}

function parseActivityDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null
  const date = new Date(value.trim())
  return Number.isNaN(date.getTime()) ? null : date
}

/** Etiqueta legible a partir de la fecha programada y la del recordatorio (p. ej. API). */
export function formatReminderLabelFromAt(
  scheduledAt: string | undefined,
  reminderAt: string | undefined,
): string {
  if (!reminderAt?.trim()) return 'Sin recordatorio'

  const reminder = parseActivityDate(reminderAt)
  if (!reminder) return 'Sin recordatorio'

  const scheduled = parseActivityDate(scheduledAt)
  if (!scheduled) {
    const when = reminder.toLocaleString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    return `Personalizado · ${when}`
  }

  const diffMs = scheduled.getTime() - reminder.getTime()
  if (diffMs <= 60_000) {
    const when = reminder.toLocaleString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    return `Personalizado · ${when}`
  }

  const diffMin = Math.round(diffMs / 60_000)
  if (Math.abs(diffMin - 15) <= 1) return '15 minutos antes'
  if (Math.abs(diffMin - 30) <= 1) return '30 minutos antes'
  if (Math.abs(diffMin - 60) <= 1) return '1 hora antes'
  if (Math.abs(diffMin - 1440) <= 1) return '1 día antes'

  if (diffMin < 60) return `${diffMin} minutos antes`
  if (diffMin < 1440) {
    const hours = Math.round(diffMin / 60)
    return hours === 1 ? '1 hora antes' : `${hours} horas antes`
  }

  const when = reminder.toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `Personalizado · ${when}`
}

export function resolveActivityReminderLabel(activity: {
  reminder?: string
  reminderAt?: string
  scheduledAt?: string
  reminderPreset?: ActivityReminderPreset
  reminderCustomAt?: string
}): string {
  if (activity.reminder?.trim()) return activity.reminder.trim()
  if (activity.reminderPreset === 'none') return 'Sin recordatorio'
  if (activity.reminderPreset) {
    return formatReminderLabel(activity.reminderPreset, activity.reminderCustomAt)
  }
  return formatReminderLabelFromAt(activity.scheduledAt, activity.reminderAt)
}
