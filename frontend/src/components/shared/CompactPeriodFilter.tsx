import { ContactFormInput, ContactFormSelect } from '@/components/contacts/ContactFormField'
import {
  buildMonthSelectOptions,
  buildYearSelectOptions,
  clampCustomDateRange,
  type CompactPeriodMode,
  type CompactPeriodValue,
} from '@/lib/period-filter-options'
import { cn } from '@/lib/utils'

export type { CompactPeriodMode, CompactPeriodValue } from '@/lib/period-filter-options'

const MODE_LABELS: Record<CompactPeriodMode, string> = {
  all: 'Todo',
  years: 'Años',
  year: 'Año',
  month: 'Mes',
  custom: 'Rango',
}

type CompactPeriodFilterProps = {
  value: CompactPeriodValue
  onChange: (value: CompactPeriodValue) => void
  modes: CompactPeriodMode[]
  className?: string
  idPrefix?: string
}

function defaultMonthPeriod(now = new Date()): CompactPeriodValue {
  return { mode: 'month', year: now.getFullYear(), month: now.getMonth() }
}

function defaultYearPeriod(now = new Date()): CompactPeriodValue {
  return { mode: 'year', year: now.getFullYear() }
}

function switchMode(mode: CompactPeriodMode, current: CompactPeriodValue): CompactPeriodValue {
  const now = new Date()
  if (mode === 'all') return { mode: 'all' }
  if (mode === 'years') return { mode: 'years' }
  if (mode === 'year') {
    if (current.mode === 'year') return current
    if (current.mode === 'month') return { mode: 'year', year: current.year }
    return defaultYearPeriod(now)
  }
  if (mode === 'month') {
    if (current.mode === 'month') return current
    if (current.mode === 'year') return { mode: 'month', year: current.year, month: now.getMonth() }
    return defaultMonthPeriod(now)
  }
  if (current.mode === 'custom') return current
  return { mode: 'custom', from: '', to: '' }
}

export function CompactPeriodFilter({
  value,
  onChange,
  modes,
  className,
  idPrefix = 'period',
}: CompactPeriodFilterProps) {
  const yearOptions = buildYearSelectOptions()
  const monthOptions = buildMonthSelectOptions()

  return (
    <div
      className={cn('space-y-3', className)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(switchMode(mode, value))}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              value.mode === mode
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {value.mode === 'years' ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Comparativo de los últimos 5 años calendario.
        </p>
      ) : null}

      {value.mode === 'year' ? (
        <ContactFormSelect
          id={`${idPrefix}-year`}
          label="Año"
          value={String(value.year)}
          onChange={(raw) => {
            const year = Number.parseInt(raw, 10)
            if (Number.isFinite(year)) onChange({ mode: 'year', year })
          }}
          options={yearOptions}
        />
      ) : null}

      {value.mode === 'month' ? (
        <div className="grid grid-cols-2 gap-2">
          <ContactFormSelect
            id={`${idPrefix}-month`}
            label="Mes"
            value={String(value.month)}
            onChange={(raw) => {
              const month = Number.parseInt(raw, 10)
              if (Number.isFinite(month)) {
                onChange({ mode: 'month', year: value.year, month })
              }
            }}
            options={monthOptions}
          />
          <ContactFormSelect
            id={`${idPrefix}-year`}
            label="Año"
            value={String(value.year)}
            onChange={(raw) => {
              const year = Number.parseInt(raw, 10)
              if (Number.isFinite(year)) {
                onChange({ mode: 'month', year, month: value.month })
              }
            }}
            options={yearOptions}
          />
        </div>
      ) : null}

      {value.mode === 'custom' ? (
        <div className="grid grid-cols-2 gap-2">
          <ContactFormInput
            id={`${idPrefix}-from`}
            label="Desde"
            type="date"
            value={value.from}
            onChange={(from) =>
              onChange({
                mode: 'custom',
                ...clampCustomDateRange(from, value.to, 'from'),
              })
            }
          />
          <ContactFormInput
            id={`${idPrefix}-to`}
            label="Hasta"
            type="date"
            value={value.to}
            onChange={(to) =>
              onChange({
                mode: 'custom',
                ...clampCustomDateRange(value.from, to, 'to'),
              })
            }
          />
        </div>
      ) : null}

      {value.mode === 'all' ? (
        <p className="text-xs text-muted-foreground">Sin restricción por fecha.</p>
      ) : null}
    </div>
  )
}
