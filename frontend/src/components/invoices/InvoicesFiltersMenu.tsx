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
  countActiveInvoiceFilters,
  createDefaultInvoiceFilters,
  INVOICE_DUE_OPTIONS,
  INVOICE_DOCUMENT_KIND_OPTIONS,
  INVOICE_PAYMENT_METHOD_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  type InvoiceFilters,
} from '@/lib/invoice-filters'
import { invoiceStageDisplayName } from '@/lib/invoice-journey'
import type { InvoiceJourneyStage } from '@/lib/invoice-journey'
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

type InvoicesFiltersMenuProps = {
  filters: InvoiceFilters
  onFiltersChange: (filters: InvoiceFilters) => void
}

export function InvoicesFiltersMenu({ filters, onFiltersChange }: InvoicesFiltersMenuProps) {
  const active = countActiveInvoiceFilters(filters)

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
        {INVOICE_STATUS_OPTIONS.map((status) => (
          <CheckboxRow
            key={status}
            checked={filters.statuses.includes(status)}
            label={invoiceStageDisplayName(status as InvoiceJourneyStage)}
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
        {INVOICE_PAYMENT_METHOD_OPTIONS.map((method) => (
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
        <DropdownMenuLabel>Tipo de documento</DropdownMenuLabel>
        {INVOICE_DOCUMENT_KIND_OPTIONS.map(({ value, label }) => (
          <CheckboxRow
            key={value}
            checked={filters.documentKind === value}
            label={label}
            onClick={() => onFiltersChange({ ...filters, documentKind: value })}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Vencimiento</DropdownMenuLabel>
        {INVOICE_DUE_OPTIONS.map(({ value, label }) => (
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
          onClick={() => onFiltersChange(createDefaultInvoiceFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
