import {
  chileDateString,
  chilePartsFromDate,
  parseChileDatetimeLocal,
} from './chile-timezone.js'

export type DashboardPeriod =
  | { mode: 'years' }
  | { mode: 'year'; year: number }
  | { mode: 'month'; year: number; month: number }

export type PeriodRanges = {
  /** Inicio inclusivo del periodo (instante UTC, medianoche Chile). */
  rangeStart: Date
  /** Fin exclusivo del periodo (medianoche Chile del día siguiente al último). */
  rangeEndExclusive: Date
  prevRangeStart: Date
  prevRangeEndExclusive: Date
  /** YYYY-MM-DD calendario Chile (inclusivo) para columnas `date`. */
  rangeStartDate: string
  rangeEndDate: string
  prevRangeStartDate: string
  prevRangeEndDate: string
  compareLabel: string
}

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
}

/** Inicio del día calendario Chile → instante UTC. */
function chileDayStart(year: number, month1: number, day: number): Date {
  const local = `${year}-${pad2(month1)}-${pad2(day)}T00:00`
  const parsed = parseChileDatetimeLocal(local)
  if (parsed) return parsed
  // Fallback si Intl/ICU no resuelve medianoche (hour=24 en algunos runtimes).
  const approxUtc = Date.UTC(year, month1 - 1, day, 4, 0, 0)
  for (const deltaMin of [0, -60, 60, -120, 120, -180, 180]) {
    const candidate = new Date(approxUtc + deltaMin * 60_000)
    const p = chilePartsFromDate(candidate)
    if (p.year === year && p.month === month1 && p.day === day && p.hour === 0 && p.minute === 0) {
      return candidate
    }
  }
  throw new Error(`Fecha Chile inválida: ${local}`)
}

/** Rango [start, endExclusive) en calendario Chile. */
function chileMonthRange(year: number, month0: number): {
  start: Date
  endExclusive: Date
  startDate: string
  endDate: string
} {
  const month1 = month0 + 1
  const lastDay = daysInMonth(year, month0)
  const start = chileDayStart(year, month1, 1)
  const nextMonth0 = month0 === 11 ? 0 : month0 + 1
  const nextYear = month0 === 11 ? year + 1 : year
  const endExclusive = chileDayStart(nextYear, nextMonth0 + 1, 1)
  return {
    start,
    endExclusive,
    startDate: `${year}-${pad2(month1)}-01`,
    endDate: `${year}-${pad2(month1)}-${pad2(lastDay)}`,
  }
}

function chileYearRange(year: number): {
  start: Date
  endExclusive: Date
  startDate: string
  endDate: string
} {
  const start = chileDayStart(year, 1, 1)
  const endExclusive = chileDayStart(year + 1, 1, 1)
  return {
    start,
    endExclusive,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  }
}

export function defaultDashboardPeriod(now = new Date()): DashboardPeriod {
  const p = chilePartsFromDate(now)
  return { mode: 'month', year: p.year, month: p.month - 1 }
}

export function parseDashboardPeriodQuery(query: {
  period?: string
  year?: string | number
  month?: string | number
}): DashboardPeriod {
  if (query.period === 'years') return { mode: 'years' }

  const year = Number.parseInt(String(query.year ?? ''), 10)
  const month = Number.parseInt(String(query.month ?? ''), 10)

  if (
    Number.isFinite(year) &&
    year >= 2000 &&
    year <= 2100 &&
    Number.isFinite(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { mode: 'month', year, month: month - 1 }
  }

  if (Number.isFinite(year) && year >= 2000 && year <= 2100) {
    return { mode: 'year', year }
  }

  return defaultDashboardPeriod()
}

export function getPeriodRanges(period: DashboardPeriod, now = new Date()): PeriodRanges {
  if (period.mode === 'month') {
    const current = chileMonthRange(period.year, period.month)
    const prevMonth0 = period.month === 0 ? 11 : period.month - 1
    const prevYear = period.month === 0 ? period.year - 1 : period.year
    const previous = chileMonthRange(prevYear, prevMonth0)
    return {
      rangeStart: current.start,
      rangeEndExclusive: current.endExclusive,
      prevRangeStart: previous.start,
      prevRangeEndExclusive: previous.endExclusive,
      rangeStartDate: current.startDate,
      rangeEndDate: current.endDate,
      prevRangeStartDate: previous.startDate,
      prevRangeEndDate: previous.endDate,
      compareLabel: 'vs. mes anterior',
    }
  }

  if (period.mode === 'year') {
    const current = chileYearRange(period.year)
    const previous = chileYearRange(period.year - 1)
    return {
      rangeStart: current.start,
      rangeEndExclusive: current.endExclusive,
      prevRangeStart: previous.start,
      prevRangeEndExclusive: previous.endExclusive,
      rangeStartDate: current.startDate,
      rangeEndDate: current.endDate,
      prevRangeStartDate: previous.startDate,
      prevRangeEndDate: previous.endDate,
      compareLabel: 'vs. año anterior',
    }
  }

  const chileNow = chilePartsFromDate(now)
  const current = chileYearRange(chileNow.year)
  const previous = chileYearRange(chileNow.year - 1)
  return {
    rangeStart: current.start,
    rangeEndExclusive: current.endExclusive,
    prevRangeStart: previous.start,
    prevRangeEndExclusive: previous.endExclusive,
    rangeStartDate: current.startDate,
    rangeEndDate: current.endDate,
    prevRangeStartDate: previous.startDate,
    prevRangeEndDate: previous.endDate,
    compareLabel: 'vs. año anterior',
  }
}

/** YYYY-MM-DD en calendario Chile (para columnas date / rangos SQL). */
export function toChileDateParam(d: Date): string {
  return chileDateString(d)
}

export function buildDashboardDateRangeLabel(period: DashboardPeriod): string {
  if (period.mode === 'years') {
    const endYear = chilePartsFromDate(new Date()).year
    return `${endYear - 4} – ${endYear} (por año)`
  }
  if (period.mode === 'year') {
    return `Año ${period.year}`
  }
  const monthName = MONTH_LABELS[period.month] ?? '—'
  return `${monthName} ${period.year}`
}

export function chartDescriptionForPeriod(period: DashboardPeriod): string {
  if (period.mode === 'years') return 'Comparación anual'
  if (period.mode === 'year') return 'Desglose mensual del año'
  return 'Desglose diario del mes'
}
