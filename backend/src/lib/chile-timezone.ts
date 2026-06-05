export const CHILE_TIMEZONE = 'America/Santiago'

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function chilePartsFromDate(date: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

export function formatChileDatetimeLocal(date: Date): string {
  const p = chilePartsFromDate(date)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`
}

export function chileDateString(date: Date): string {
  const p = chilePartsFromDate(date)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

export function parseChileDatetimeLocal(value: string): Date | null {
  const match = DATETIME_LOCAL_RE.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (
    [year, month, day, hour, minute].some((n) => Number.isNaN(n)) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return null
  }

  const targetKey = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}`

  let lo = Date.UTC(year, month - 1, day - 1, 3, 0)
  let hi = Date.UTC(year, month - 1, day + 1, 8, 0)
  for (let i = 0; i < 32; i++) {
    const mid = Math.floor((lo + hi) / 2)
    const formatted = formatChileDatetimeLocal(new Date(mid))
    if (formatted === targetKey) return new Date(mid)
    if (formatted < targetKey) lo = mid + 60_000
    else hi = mid - 60_000
  }
  return null
}

export function parseChileDatetimeInput(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (DATETIME_LOCAL_RE.test(trimmed)) {
    return parseChileDatetimeLocal(trimmed)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isoToChileDatetimeLocal(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return ''
  return formatChileDatetimeLocal(date)
}

export function isSameChileCalendarDay(a: Date, b: Date): boolean {
  return chileDateString(a) === chileDateString(b)
}

export function formatChileActivityLabel(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const time = date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CHILE_TIMEZONE,
  })

  if (isSameChileCalendarDay(date, now)) return `Hoy, ${time}`

  const tomorrow = new Date(now.getTime() + 86_400_000)
  if (isSameChileCalendarDay(date, tomorrow)) return `Mañana, ${time}`

  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: CHILE_TIMEZONE,
  })
}

export function formatChileDateTimeLabel(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CHILE_TIMEZONE,
  })
}

/** Etiqueta corta para inicios de sesión (Hoy/Ayer/fecha sin año). */
export function formatChileSessionWhen(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const time = date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CHILE_TIMEZONE,
  })

  if (isSameChileCalendarDay(date, now)) return `Hoy, ${time}`

  const yesterday = new Date(now.getTime() - 86_400_000)
  if (isSameChileCalendarDay(date, yesterday)) return `Ayer, ${time}`

  const dateLabel = date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    timeZone: CHILE_TIMEZONE,
  })
  return `${dateLabel}, ${time}`
}

/** Fecha corta en calendario Chile (ej. `30 jun 2024`). */
export function formatChileDateLabel(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: CHILE_TIMEZONE,
  })
}
