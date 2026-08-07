import { Check, Filter } from 'lucide-react'

import { CompactPeriodFilter } from '@/components/shared/CompactPeriodFilter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  countActiveBoletaFilters,
  createDefaultBoletaFilters,
  BOLETA_PAYMENT_METHOD_OPTIONS,
  BOLETA_STATUS_OPTIONS,
  type BoletaFilters,
} from '@/lib/boleta-filters'
import { boletaStageDisplayName } from '@/lib/boleta-journey'
import type { BoletaJourneyStage } from '@/lib/boleta-journey'
import {
  labelForListDateFilter,
  listDateToCompact,
  compactToListDate,
} from '@/lib/list-date-filter'
import { cn } from '@/lib/utils'

function CheckboxRow({
  checked,
  label,
  onClick,
}: {
  checked: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
      onClick={onClick}
    >
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded border border-border',
          checked && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {checked ? <Check aria-hidden className="size-3" /> : null}
      </span>
      {label}
    </button>
  )
}

type BoletasFiltersMenuProps = {
  filters: BoletaFilters
  onFiltersChange: (filters: BoletaFilters) => void
}

export function BoletasFiltersMenu({ filters, onFiltersChange }: BoletasFiltersMenuProps) {
  const active = countActiveBoletaFilters(filters)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('border-border shadow-sm', active > 0 && 'border-primary/40 bg-primary/5')}
        >
          <Filter aria-hidden className="size-4" />
          Filtros
          {active > 0 ? (
            <Badge variant="default" className="ms-1 h-5 min-w-5 px-1.5 text-[10px]">
              {active}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70vh] w-80 overflow-y-auto p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel>Fecha</DropdownMenuLabel>
        <p className="mb-2 px-0.5 text-xs text-muted-foreground">
          {labelForListDateFilter(filters.date)}
        </p>
        <CompactPeriodFilter
          idPrefix="boletas-filter"
          modes={['all', 'month', 'year', 'custom']}
          value={listDateToCompact(filters.date)}
          onChange={(next) =>
            onFiltersChange({ ...filters, date: compactToListDate(next) })
          }
        />

        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel>Estado</DropdownMenuLabel>
        {BOLETA_STATUS_OPTIONS.map((status) => (
          <CheckboxRow
            key={status}
            checked={filters.statuses.includes(status)}
            label={boletaStageDisplayName(status as BoletaJourneyStage)}
            onClick={() => {
              const statuses = filters.statuses.includes(status)
                ? filters.statuses.filter((s) => s !== status)
                : [...filters.statuses, status]
              onFiltersChange({ ...filters, statuses })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Medio de pago</DropdownMenuLabel>
        {BOLETA_PAYMENT_METHOD_OPTIONS.map((method) => (
          <CheckboxRow
            key={method}
            checked={filters.paymentMethods.includes(method)}
            label={method}
            onClick={() => {
              const paymentMethods = filters.paymentMethods.includes(method)
                ? filters.paymentMethods.filter((m) => m !== method)
                : [...filters.paymentMethods, method]
              onFiltersChange({ ...filters, paymentMethods })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent"
          onClick={() => onFiltersChange(createDefaultBoletaFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
