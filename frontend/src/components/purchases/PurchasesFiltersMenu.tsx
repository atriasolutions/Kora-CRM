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
  countActivePurchaseFilters,
  createDefaultPurchaseFilters,
  PURCHASE_STATUS_OPTIONS,
  type PurchaseFilters,
} from '@/lib/purchase-filters'
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

type PurchasesFiltersMenuProps = {
  filters: PurchaseFilters
  onFiltersChange: (filters: PurchaseFilters) => void
}

export function PurchasesFiltersMenu({
  filters,
  onFiltersChange,
}: PurchasesFiltersMenuProps) {
  const active = countActivePurchaseFilters(filters)

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
        <DropdownMenuLabel>Fecha de orden</DropdownMenuLabel>
        <p className="mb-2 px-0.5 text-xs text-muted-foreground">
          {labelForListDateFilter(filters.date)}
        </p>
        <CompactPeriodFilter
          idPrefix="purchases-filter"
          modes={['all', 'month', 'year', 'custom']}
          value={listDateToCompact(filters.date)}
          onChange={(next) =>
            onFiltersChange({ ...filters, date: compactToListDate(next) })
          }
        />

        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel>Estado</DropdownMenuLabel>
        {PURCHASE_STATUS_OPTIONS.map((status) => (
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
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent"
          onClick={() => onFiltersChange(createDefaultPurchaseFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
