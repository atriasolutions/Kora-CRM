import type { CompactPeriodValue } from '@/lib/period-filter-options'

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
  return { mode: 'month', year: now.getFullYear(), month: now.getMonth() }
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
    const endYear = new Date().getFullYear()
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

  const currentYear = now.getFullYear()
  for (let y = currentYear; y >= currentYear - 6; y -= 1) {
    options.push({
      id: `year-${y}`,
      label: `Año ${y}`,
      period: { mode: 'year', year: y },
    })
  }

  for (let i = 0; i < 18; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const period: DashboardPeriod = {
      mode: 'month',
      year: d.getFullYear(),
      month: d.getMonth(),
    }
    options.push({
      id: periodOptionId(period),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
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
