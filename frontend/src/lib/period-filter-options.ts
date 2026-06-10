import { MONTH_NAMES } from '@/lib/dashboard-period'

export type CompactPeriodMode = 'all' | 'years' | 'year' | 'month' | 'custom'

export type CompactPeriodValue =
  | { mode: 'all' }
  | { mode: 'years' }
  | { mode: 'year'; year: number }
  | { mode: 'month'; year: number; month: number }
  | { mode: 'custom'; from: string; to: string }

export function buildYearSelectOptions(
  now = new Date(),
  span = 7,
): { value: string; label: string }[] {
  const currentYear = now.getFullYear()
  const options: { value: string; label: string }[] = []
  for (let y = currentYear; y >= currentYear - (span - 1); y -= 1) {
    options.push({ value: String(y), label: String(y) })
  }
  return options
}

export function buildMonthSelectOptions(): { value: string; label: string }[] {
  return MONTH_NAMES.map((name, index) => ({
    value: String(index),
    label: name,
  }))
}

/** Ajusta el otro extremo cuando el rango queda invertido (YYYY-MM-DD). */
export function clampCustomDateRange(
  from: string,
  to: string,
  edited: 'from' | 'to',
): { from: string; to: string } {
  const f = from.trim()
  const t = to.trim()
  if (!f || !t || f <= t) return { from: f, to: t }
  if (edited === 'from') return { from: f, to: f }
  return { from: t, to: t }
}

/** Normaliza un rango ya guardado intercambiando fechas si from > to. */
export function normalizeCustomDateRange(
  from: string,
  to: string,
): { from: string; to: string } {
  const f = from.trim()
  const t = to.trim()
  if (!f || !t || f <= t) return { from: f, to: t }
  return { from: t, to: f }
}
