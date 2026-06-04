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
  countActiveOpportunityFilters,
  createDefaultOpportunityFilters,
  OPPORTUNITY_LAST_ACTIVITY_OPTIONS,
  OPPORTUNITY_OUTCOME_OPTIONS,
  OPPORTUNITY_PRIORITY_FILTER_OPTIONS,
  OPPORTUNITY_STAGE_OPTIONS,
  type OpportunityFilters,
} from '@/lib/opportunity-filters'
import { cn } from '@/lib/utils'

type OpportunitiesFiltersMenuProps = {
  filters: OpportunityFilters
  onFiltersChange: (filters: OpportunityFilters) => void
}

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

export function OpportunitiesFiltersMenu({
  filters,
  onFiltersChange,
}: OpportunitiesFiltersMenuProps) {
  const active = countActiveOpportunityFilters(filters)

  const toggleStage = (stage: (typeof OPPORTUNITY_STAGE_OPTIONS)[number]) => {
    const stages = filters.stages.includes(stage)
      ? filters.stages.filter((s) => s !== stage)
      : [...filters.stages, stage]
    onFiltersChange({ ...filters, stages })
  }

  const toggleOutcome = (outcome: (typeof OPPORTUNITY_OUTCOME_OPTIONS)[number]) => {
    const outcomes = filters.outcomes.includes(outcome)
      ? filters.outcomes.filter((o) => o !== outcome)
      : [...filters.outcomes, outcome]
    onFiltersChange({ ...filters, outcomes })
  }

  const togglePriority = (priority: (typeof OPPORTUNITY_PRIORITY_FILTER_OPTIONS)[number]) => {
    const priorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ ...filters, priorities })
  }

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
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Etapa</DropdownMenuLabel>
        {OPPORTUNITY_STAGE_OPTIONS.map((stage) => (
          <CheckboxRow
            key={stage}
            checked={filters.stages.includes(stage)}
            label={stage}
            onClick={() => toggleStage(stage)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Resultado</DropdownMenuLabel>
        {OPPORTUNITY_OUTCOME_OPTIONS.map((outcome) => (
          <CheckboxRow
            key={outcome}
            checked={filters.outcomes.includes(outcome)}
            label={outcome}
            onClick={() => toggleOutcome(outcome)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Prioridad</DropdownMenuLabel>
        {OPPORTUNITY_PRIORITY_FILTER_OPTIONS.map((priority) => (
          <CheckboxRow
            key={priority}
            checked={filters.priorities.includes(priority)}
            label={priority}
            onClick={() => togglePriority(priority)}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Última actividad</DropdownMenuLabel>
        {OPPORTUNITY_LAST_ACTIVITY_OPTIONS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            checked={filters.lastActivity === value}
            label={label}
            onClick={() => onFiltersChange({ ...filters, lastActivity: value })}
          />
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent"
          onClick={() => onFiltersChange(createDefaultOpportunityFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
