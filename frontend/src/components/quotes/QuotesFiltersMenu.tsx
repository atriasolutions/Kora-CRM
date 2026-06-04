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
  countActiveQuoteFilters,
  createDefaultQuoteFilters,
  QUOTE_JOURNEY_STAGE_OPTIONS,
  toggleQuoteStatus,
  type QuoteFilters,
} from '@/lib/quote-filters'
import { cn } from '@/lib/utils'

type QuotesFiltersMenuProps = {
  filters: QuoteFilters
  onFiltersChange: (filters: QuoteFilters) => void
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

export function QuotesFiltersMenu({ filters, onFiltersChange }: QuotesFiltersMenuProps) {
  const active = countActiveQuoteFilters(filters)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'border-border shadow-sm',
            active > 0 && 'border-primary/40 bg-primary/5',
          )}
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
        {QUOTE_JOURNEY_STAGE_OPTIONS.map((status) => (
          <CheckboxRow
            key={status}
            checked={filters.statuses.includes(status)}
            label={status}
            onClick={() => onFiltersChange(toggleQuoteStatus(filters, status))}
          />
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onFiltersChange(createDefaultQuoteFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
