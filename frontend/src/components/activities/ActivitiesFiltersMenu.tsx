import { Check, Filter } from 'lucide-react'

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
  ACTIVITY_DUE_OPTIONS,
  ACTIVITY_PRIORITY_FILTER_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_TYPE_FILTER_OPTIONS,
  countActiveActivityFilters,
  createDefaultActivityFilters,
  type ActivityFilters,
} from '@/lib/activity-filters'
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

type ActivitiesFiltersMenuProps = {
  filters: ActivityFilters
  onFiltersChange: (filters: ActivityFilters) => void
}

export function ActivitiesFiltersMenu({
  filters,
  onFiltersChange,
}: ActivitiesFiltersMenuProps) {
  const active = countActiveActivityFilters(filters)

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
      <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
        <DropdownMenuLabel>Estado</DropdownMenuLabel>
        {ACTIVITY_STATUS_OPTIONS.map((status) => (
          <CheckboxRow
            key={status}
            checked={filters.statuses.includes(status)}
            label={status}
            onClick={() => {
              const statuses = filters.statuses.includes(status)
                ? filters.statuses.filter((s) => s !== status)
                : [...filters.statuses, status]
              onFiltersChange({ ...filters, statuses })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Tipo</DropdownMenuLabel>
        {ACTIVITY_TYPE_FILTER_OPTIONS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            checked={filters.types.includes(value)}
            label={label}
            onClick={() => {
              const types = filters.types.includes(value)
                ? filters.types.filter((t) => t !== value)
                : [...filters.types, value]
              onFiltersChange({ ...filters, types })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Prioridad</DropdownMenuLabel>
        {ACTIVITY_PRIORITY_FILTER_OPTIONS.map((priority) => (
          <CheckboxRow
            key={priority}
            checked={filters.priorities.includes(priority)}
            label={priority}
            onClick={() => {
              const priorities = filters.priorities.includes(priority)
                ? filters.priorities.filter((p) => p !== priority)
                : [...filters.priorities, priority]
              onFiltersChange({ ...filters, priorities })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Vencimiento</DropdownMenuLabel>
        {ACTIVITY_DUE_OPTIONS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            checked={filters.due === value}
            label={label}
            onClick={() => onFiltersChange({ ...filters, due: value })}
          />
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent"
          onClick={() => onFiltersChange(createDefaultActivityFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
