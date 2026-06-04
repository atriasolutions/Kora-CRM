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
import { Input } from '@/components/ui/input'
import {
  countActiveStockReceiptFilters,
  createDefaultStockReceiptFilters,
  STOCK_RECEIPT_STATUS_OPTIONS,
  type StockReceiptFilters,
} from '@/lib/stock-receipt-filters'
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

type StockReceiptsFiltersMenuProps = {
  filters: StockReceiptFilters
  onFiltersChange: (filters: StockReceiptFilters) => void
}

export function StockReceiptsFiltersMenu({
  filters,
  onFiltersChange,
}: StockReceiptsFiltersMenuProps) {
  const active = countActiveStockReceiptFilters(filters)

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Estado</DropdownMenuLabel>
        {STOCK_RECEIPT_STATUS_OPTIONS.map((status) => (
          <CheckboxRow
            key={status}
            label={status}
            checked={filters.statuses.includes(status)}
            onClick={() => {
              const next = filters.statuses.includes(status)
                ? filters.statuses.filter((s) => s !== status)
                : [...filters.statuses, status]
              onFiltersChange({ ...filters, statuses: next })
            }}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Origen</DropdownMenuLabel>
        {(
          [
            { id: 'all', label: 'Todos' },
            { id: 'purchase', label: 'Desde OC' },
            { id: 'external', label: 'Referencia externa' },
          ] as const
        ).map((opt) => (
          <CheckboxRow
            key={opt.id}
            label={opt.label}
            checked={filters.origin === opt.id}
            onClick={() => onFiltersChange({ ...filters, origin: opt.id })}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Bodega</DropdownMenuLabel>
        <div className="px-2 pb-2">
          <Input
            value={filters.warehouse}
            onChange={(e) => onFiltersChange({ ...filters, warehouse: e.target.value })}
            placeholder="Filtrar bodega…"
            className="h-8 text-sm"
          />
        </div>
        {active > 0 ? (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              className="w-full px-2 py-1.5 text-left text-xs text-primary hover:underline"
              onClick={() => onFiltersChange(createDefaultStockReceiptFilters())}
            >
              Limpiar filtros
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
