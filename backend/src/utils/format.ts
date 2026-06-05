import {
  formatChileActivityLabel,
  formatChileDateLabel,
  formatChileDateTimeLabel,
  formatChileSessionWhen,
  isoToChileDatetimeLocal,
  parseChileDatetimeInput,
} from '../lib/chile-timezone.js'

/** Etiqueta para sesiones de usuario (incluye hora). */
export function formatSessionWhen(iso: string | Date | null | undefined): string {
  return formatChileSessionWhen(iso)
}

/** Etiqueta legible para listas (aprox. formato demo). */
export function formatActivityLabel(iso: string | Date | null | undefined): string {
  return formatChileActivityLabel(iso)
}

export function formatReminderLabelFromAt(
  scheduledAt: Date | string | null | undefined,
  reminderAt: Date | string | null | undefined,
): string | undefined {
  if (!reminderAt) return undefined

  const reminder = reminderAt instanceof Date ? reminderAt : new Date(reminderAt)
  if (Number.isNaN(reminder.getTime())) return undefined

  const scheduled = scheduledAt
    ? scheduledAt instanceof Date
      ? scheduledAt
      : new Date(scheduledAt)
    : null

  if (!scheduled || Number.isNaN(scheduled.getTime())) {
    const when = formatChileDateTimeLabel(reminder)
    return `Personalizado · ${when}`
  }

  const diffMs = scheduled.getTime() - reminder.getTime()
  if (diffMs <= 60_000) {
    const when = formatChileDateTimeLabel(reminder)
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

  const when = formatChileDateTimeLabel(reminder)
  return `Personalizado · ${when}`
}

export function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

/** Fecha corta para listas (ej. `30 jun 2024`). */
export function formatDateLabel(value: Date | string | null | undefined): string {
  return formatChileDateLabel(value)
}

export function parseDatetimeInput(value: string | null | undefined): Date | null {
  return parseChileDatetimeInput(value)
}

export function toDatetimeLocalValue(iso: string | Date | null | undefined): string {
  return isoToChileDatetimeLocal(iso)
}

const MONTHS_ES: Record<string, number> = {
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

/** Acepta yyyy-mm-dd o fechas es-CL (ej. «4 jul 2026»). */
export function parseDateInput(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length >= 3) {
    const day = Number.parseInt(parts[0] ?? '', 10)
    const monthKey = (parts[1] ?? '').replace(/\./g, '').toLowerCase().slice(0, 3)
    const year = Number.parseInt(parts[2] ?? '', 10)
    const month = MONTHS_ES[monthKey]
    if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
      const y = String(year)
      const m = String(month + 1).padStart(2, '0')
      const d = String(day).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}
