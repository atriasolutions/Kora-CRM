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
  countActiveProjectFilters,
  createDefaultProjectFilters,
  PROJECT_DEADLINE_OPTIONS,
  PROJECT_HEALTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_JOURNEY_STAGE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectFilters,
} from '@/lib/project-filters'
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

type ProjectsFiltersMenuProps = {
  filters: ProjectFilters
  onFiltersChange: (filters: ProjectFilters) => void
}

export function ProjectsFiltersMenu({ filters, onFiltersChange }: ProjectsFiltersMenuProps) {
  const active = countActiveProjectFilters(filters)

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
        <DropdownMenuLabel>Fecha de creación</DropdownMenuLabel>
        <p className="mb-2 px-0.5 text-xs text-muted-foreground">
          {labelForListDateFilter(filters.date)}
        </p>
        <CompactPeriodFilter
          idPrefix="projects-filter"
          modes={['all', 'month', 'year', 'custom']}
          value={listDateToCompact(filters.date)}
          onChange={(next) =>
            onFiltersChange({ ...filters, date: compactToListDate(next) })
          }
        />

        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel>Estado</DropdownMenuLabel>
        {PROJECT_STATUS_OPTIONS.map((status) => (
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
        <DropdownMenuLabel>Ruta del éxito</DropdownMenuLabel>
        {PROJECT_JOURNEY_STAGE_OPTIONS.map((stage) => (
          <CheckboxRow
            key={stage}
            checked={filters.journeyStages.includes(stage)}
            label={stage}
            onClick={() => {
              const journeyStages = filters.journeyStages.includes(stage)
                ? filters.journeyStages.filter((s) => s !== stage)
                : [...filters.journeyStages, stage]
              onFiltersChange({ ...filters, journeyStages })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Salud</DropdownMenuLabel>
        {PROJECT_HEALTH_OPTIONS.map((health) => (
          <CheckboxRow
            key={health}
            checked={filters.health.includes(health)}
            label={health}
            onClick={() => {
              const healthList = filters.health.includes(health)
                ? filters.health.filter((h) => h !== health)
                : [...filters.health, health]
              onFiltersChange({ ...filters, health: healthList })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Prioridad</DropdownMenuLabel>
        {PROJECT_PRIORITY_OPTIONS.map((priority) => (
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
        <DropdownMenuLabel>Entrega</DropdownMenuLabel>
        {PROJECT_DEADLINE_OPTIONS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            checked={filters.deadline === value}
            label={label}
            onClick={() => onFiltersChange({ ...filters, deadline: value })}
          />
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent"
          onClick={() => onFiltersChange(createDefaultProjectFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
