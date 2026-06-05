import { useEffect, useMemo } from 'react'

import { MONTH_NAMES } from '@/lib/dashboard-period'
import {
  buildWorkHoursMonthKey,
  monthsWithDataForYear,
  parseWorkHoursMonthKey,
  yearsWithData,
} from '@/lib/project-work-hours-by-assignee'
import { cn } from '@/lib/utils'

const periodSelectClass = cn(
  'h-9 min-h-9 w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-sm',
  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

type WorkHoursMonthFieldProps = {
  value: string
  availableMonthKeys: string[]
  onChange: (value: string) => void
}

export function WorkHoursMonthField({
  value,
  availableMonthKeys,
  onChange,
}: WorkHoursMonthFieldProps) {
  const years = useMemo(() => yearsWithData(availableMonthKeys), [availableMonthKeys])
  const parsed = parseWorkHoursMonthKey(value)
  const year = parsed?.year ?? years[0] ?? new Date().getFullYear()
  const monthsForYear = useMemo(
    () => monthsWithDataForYear(availableMonthKeys, year),
    [availableMonthKeys, year],
  )
  const month =
    parsed?.month && monthsForYear.includes(parsed.month)
      ? parsed.month
      : (monthsForYear[0] ?? 1)

  useEffect(() => {
    const key = buildWorkHoursMonthKey(year, month)
    if (value !== key && availableMonthKeys.includes(key)) {
      onChange(key)
    }
  }, [value, year, month, availableMonthKeys, onChange])

  if (availableMonthKeys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay actividades con fechas planificadas para filtrar por mes.
      </p>
    )
  }

  const setYear = (nextYear: number) => {
    const nextMonths = monthsWithDataForYear(availableMonthKeys, nextYear)
    const nextMonth = nextMonths.includes(month) ? month : (nextMonths[0] ?? 1)
    onChange(buildWorkHoursMonthKey(nextYear, nextMonth))
  }

  const setMonth = (nextMonth: number) => {
    onChange(buildWorkHoursMonthKey(year, nextMonth))
  }

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Mes del periodo</legend>
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <span
          id="work-hours-month-label"
          className="shrink-0 text-xs font-medium text-muted-foreground sm:me-0.5"
        >
          Mes
        </span>
        <div
          className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-none sm:gap-2"
          aria-labelledby="work-hours-month-label"
        >
          <select
            className={cn(periodSelectClass, 'sm:w-[9.5rem]')}
            value={month}
            aria-label="Mes"
            disabled={monthsForYear.length === 0}
            onChange={(e) => setMonth(Number.parseInt(e.target.value, 10))}
          >
            {monthsForYear.map((m) => (
              <option key={m} value={m}>
                {MONTH_NAMES[m - 1]}
              </option>
            ))}
          </select>
          <select
            className={cn(periodSelectClass, 'sm:w-[5.5rem]')}
            value={year}
            aria-label="Año"
            disabled={years.length === 0}
            onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  )
}
