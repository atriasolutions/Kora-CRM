import type { CompactPeriodValue } from '@/lib/period-filter-options'
import { chilePartsFromDate } from '@/lib/chile-timezone'

export type DashboardPeriod =
  | { mode: 'years' }
  | { mode: 'year'; year: number }
  | { mode: 'month'; year: number; month: number }

export type DashboardPeriodOption = {
  id: string
  label: string
  period: DashboardPeriod
}

export const MONTH_NAMES = [
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
  const p = chilePartsFromDate(now)
  return { mode: 'month', year: p.year, month: p.month - 1 }
}

export function periodToQuery(period: DashboardPeriod): string {
  if (period.mode === 'years') return 'period=years'
  if (period.mode === 'year') return `year=${period.year}`
  return `year=${period.year}&month=${period.month + 1}`
}

export function periodOptionId(period: DashboardPeriod): string {
  if (period.mode === 'years') return 'years'
  if (period.mode === 'year') return `year-${period.year}`
  return `month-${period.year}-${period.month}`
}

export function labelForPeriod(period: DashboardPeriod): string {
  if (period.mode === 'years') {
    const endYear = chilePartsFromDate(new Date()).year
    return `${endYear - 4} – ${endYear} (por año)`
  }
  if (period.mode === 'year') return `Año ${period.year}`
  return `${MONTH_NAMES[period.month] ?? '—'} ${period.year}`
}

export function buildDashboardPeriodOptions(now = new Date()): DashboardPeriodOption[] {
  const options: DashboardPeriodOption[] = [
    {
      id: 'years',
      label: 'Por años (últimos 5)',
      period: { mode: 'years' },
    },
  ]

  const chileNow = chilePartsFromDate(now)
  const currentYear = chileNow.year
  for (let y = currentYear; y >= currentYear - 6; y -= 1) {
    options.push({
      id: `year-${y}`,
      label: `Año ${y}`,
      period: { mode: 'year', year: y },
    })
  }

  for (let i = 0; i < 18; i += 1) {
    let month = chileNow.month - 1 - i
    let year = chileNow.year
    while (month < 0) {
      month += 12
      year -= 1
    }
    const period: DashboardPeriod = {
      mode: 'month',
      year,
      month,
    }
    options.push({
      id: periodOptionId(period),
      label: `${MONTH_NAMES[month]} ${year}`,
      period,
    })
  }

  return options
}

export function dashboardPeriodToCompact(value: DashboardPeriod): CompactPeriodValue {
  if (value.mode === 'years') return { mode: 'years' }
  if (value.mode === 'year') return { mode: 'year', year: value.year }
  return { mode: 'month', year: value.year, month: value.month }
}

export function compactToDashboardPeriod(value: CompactPeriodValue): DashboardPeriod {
  if (value.mode === 'years') return { mode: 'years' }
  if (value.mode === 'year') return { mode: 'year', year: value.year }
  if (value.mode === 'month') return { mode: 'month', year: value.year, month: value.month }
  return defaultDashboardPeriod()
}

export function findPeriodOption(
  options: DashboardPeriodOption[],
  period: DashboardPeriod,
): DashboardPeriodOption | undefined {
  const id = periodOptionId(period)
  return options.find((o) => o.id === id)
}
