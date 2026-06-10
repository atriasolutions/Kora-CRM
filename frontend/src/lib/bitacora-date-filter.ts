import type { CompactPeriodValue } from '@/lib/period-filter-options'
import { normalizeCustomDateRange } from '@/lib/period-filter-options'
import { MONTH_NAMES } from '@/lib/dashboard-period'

export type BitacoraDateFilter =
  | { mode: 'all' }
  | { mode: 'year'; year: number }
  | { mode: 'month'; year: number; month: number }
  | { mode: 'custom'; from: string; to: string }

export type BitacoraDateFilterOption = {
  id: string
  label: string
  filter: BitacoraDateFilter
}

export function createDefaultBitacoraDateFilter(): BitacoraDateFilter {
  return { mode: 'all' }
}

export function bitacoraDateFilterId(filter: BitacoraDateFilter): string {
  if (filter.mode === 'all') return 'all'
  if (filter.mode === 'year') return `year-${filter.year}`
  if (filter.mode === 'month') return `month-${filter.year}-${filter.month}`
  return `custom-${filter.from}-${filter.to}`
}

export function labelForBitacoraDateFilter(filter: BitacoraDateFilter): string {
  if (filter.mode === 'all') return 'Cualquier fecha'
  if (filter.mode === 'year') return `Año ${filter.year}`
  if (filter.mode === 'month') {
    return `${MONTH_NAMES[filter.month] ?? '—'} ${filter.year}`
  }
  const normalized = normalizeCustomDateRange(filter.from, filter.to)
  if (normalized.from && normalized.to) return `${normalized.from} – ${normalized.to}`
  if (normalized.from) return `Desde ${normalized.from}`
  if (normalized.to) return `Hasta ${normalized.to}`
  return 'Rango personalizado'
}

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function resolveBitacoraDateBounds(
  filter: BitacoraDateFilter,
): { from: string | null; to: string | null } {
  if (filter.mode === 'all') return { from: null, to: null }
  if (filter.mode === 'year') {
    return {
      from: `${filter.year}-01-01`,
      to: `${filter.year}-12-31`,
    }
  }
  if (filter.mode === 'month') {
    const last = lastDayOfMonth(filter.year, filter.month)
    return {
      from: padDate(filter.year, filter.month, 1),
      to: padDate(filter.year, filter.month, last),
    }
  }
  const normalized = normalizeCustomDateRange(filter.from, filter.to)
  const from = normalized.from || null
  const to = normalized.to || null
  if (!from && !to) return { from: null, to: null }
  return { from, to }
}

export function isBitacoraDateFilterActive(filter: BitacoraDateFilter): boolean {
  if (filter.mode === 'all') return false
  if (filter.mode === 'custom') {
    return Boolean(filter.from.trim() && filter.to.trim())
  }
  return true
}

export function bitacoraRowMatchesDateFilter(
  workDate: string,
  filter: BitacoraDateFilter,
): boolean {
  const bounds = resolveBitacoraDateBounds(filter)
  if (!bounds.from && !bounds.to) return true
  const wd = workDate.slice(0, 10)
  if (bounds.from && wd < bounds.from) return false
  if (bounds.to && wd > bounds.to) return false
  return true
}

export function bitacoraDateToCompact(value: BitacoraDateFilter): CompactPeriodValue {
  if (value.mode === 'all') return { mode: 'all' }
  if (value.mode === 'year') return { mode: 'year', year: value.year }
  if (value.mode === 'month') return { mode: 'month', year: value.year, month: value.month }
  const normalized = normalizeCustomDateRange(value.from, value.to)
  return { mode: 'custom', from: normalized.from, to: normalized.to }
}

export function compactToBitacoraDate(value: CompactPeriodValue): BitacoraDateFilter {
  if (value.mode === 'all') return { mode: 'all' }
  if (value.mode === 'year') return { mode: 'year', year: value.year }
  if (value.mode === 'month') return { mode: 'month', year: value.year, month: value.month }
  if (value.mode === 'custom') {
    const normalized = normalizeCustomDateRange(value.from, value.to)
    return { mode: 'custom', from: normalized.from, to: normalized.to }
  }
  return { mode: 'all' }
}

export function buildBitacoraDateFilterOptions(now = new Date()): BitacoraDateFilterOption[] {
  const options: BitacoraDateFilterOption[] = [
    {
      id: 'all',
      label: 'Cualquier fecha',
      filter: { mode: 'all' },
    },
  ]

  const currentYear = now.getFullYear()
  for (let y = currentYear; y >= currentYear - 6; y -= 1) {
    options.push({
      id: `year-${y}`,
      label: `Año ${y}`,
      filter: { mode: 'year', year: y },
    })
  }

  for (let i = 0; i < 18; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const filter: BitacoraDateFilter = {
      mode: 'month',
      year: d.getFullYear(),
      month: d.getMonth(),
    }
    options.push({
      id: bitacoraDateFilterId(filter),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      filter,
    })
  }

  return options
}
