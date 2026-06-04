export type DashboardPeriod =
  | { mode: 'years' }
  | { mode: 'year'; year: number }
  | { mode: 'month'; year: number; month: number }

export type PeriodRanges = {
  rangeStart: Date
  rangeEnd: Date
  prevRangeStart: Date
  prevRangeEnd: Date
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

export function defaultDashboardPeriod(now = new Date()): DashboardPeriod {
  return { mode: 'month', year: now.getFullYear(), month: now.getMonth() }
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
    const rangeStart = new Date(period.year, period.month, 1)
    const rangeEnd = new Date(period.year, period.month + 1, 0, 23, 59, 59, 999)
    const prevRangeStart = new Date(period.year, period.month - 1, 1)
    const prevRangeEnd = new Date(period.year, period.month, 0, 23, 59, 59, 999)
    return {
      rangeStart,
      rangeEnd,
      prevRangeStart,
      prevRangeEnd,
      compareLabel: 'vs. mes anterior',
    }
  }

  if (period.mode === 'year') {
    const rangeStart = new Date(period.year, 0, 1)
    const rangeEnd = new Date(period.year, 11, 31, 23, 59, 59, 999)
    const prevRangeStart = new Date(period.year - 1, 0, 1)
    const prevRangeEnd = new Date(period.year - 1, 11, 31, 23, 59, 59, 999)
    return {
      rangeStart,
      rangeEnd,
      prevRangeStart,
      prevRangeEnd,
      compareLabel: 'vs. año anterior',
    }
  }

  const currentYear = now.getFullYear()
  const rangeStart = new Date(currentYear, 0, 1)
  const rangeEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)
  const prevRangeStart = new Date(currentYear - 1, 0, 1)
  const prevRangeEnd = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999)
  return {
    rangeStart,
    rangeEnd,
    prevRangeStart,
    prevRangeEnd,
    compareLabel: 'vs. año anterior',
  }
}

export function buildDashboardDateRangeLabel(period: DashboardPeriod): string {
  if (period.mode === 'years') {
    const endYear = new Date().getFullYear()
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
  return 'Últimos 6 meses'
}
