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
  CONTACT_LAST_CONTACT_OPTIONS,
  CONTACT_OUTREACH_FILTER_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  countActiveContactFilters,
  createDefaultContactFilters,
  toggleContactStatus,
  type ContactFilters,
} from '@/lib/contact-filters'
import {
  labelForListDateFilter,
  listDateToCompact,
  compactToListDate,
} from '@/lib/list-date-filter'
import { cn } from '@/lib/utils'

type ContactsFiltersMenuProps = {
  filters: ContactFilters
  onFiltersChange: (filters: ContactFilters) => void
}

export function ContactsFiltersMenu({
  filters,
  onFiltersChange,
}: ContactsFiltersMenuProps) {
  const activeCount = countActiveContactFilters(filters)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'border-border shadow-sm',
            activeCount > 0 && 'border-primary/40 bg-primary/5',
          )}
        >
          <Filter aria-hidden className="size-4" />
          Filtros
          {activeCount > 0 ? (
            <Badge variant="default" className="ms-1 h-5 min-w-5 px-1.5 text-[10px]">
              {activeCount}
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
          idPrefix="contacts-filter"
          modes={['all', 'month', 'year', 'custom']}
          value={listDateToCompact(filters.date)}
          onChange={(next) =>
            onFiltersChange({ ...filters, date: compactToListDate(next) })
          }
        />
        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel>Estado del contacto</DropdownMenuLabel>
        {CONTACT_STATUS_OPTIONS.map((status) => {
          const checked = filters.statuses.includes(status)
          return (
            <button
              key={status}
              type="button"
              className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() =>
                onFiltersChange(toggleContactStatus(filters, status))
              }
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded border border-border',
                  checked && 'border-primary bg-primary text-primary-foreground',
                )}
              >
                {checked ? <Check aria-hidden className="size-3" /> : null}
              </span>
              {status}
            </button>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Último contacto</DropdownMenuLabel>
        {CONTACT_LAST_CONTACT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={cn(
              'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
              filters.lastContact === value && 'bg-accent/60 font-medium',
            )}
            onClick={() => onFiltersChange({ ...filters, lastContact: value })}
          >
            <span
              className={cn(
                'size-2 rounded-full border border-border',
                filters.lastContact === value && 'border-primary bg-primary',
              )}
            />
            {label}
          </button>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Intento de contacto</DropdownMenuLabel>
        {CONTACT_OUTREACH_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={cn(
              'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
              filters.outreach === value && 'bg-accent/60 font-medium',
            )}
            onClick={() => onFiltersChange({ ...filters, outreach: value })}
          >
            <span
              className={cn(
                'size-2 rounded-full border border-border',
                filters.outreach === value && 'border-primary bg-primary',
              )}
            />
            {label}
          </button>
        ))}

        {activeCount > 0 ? (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => onFiltersChange(createDefaultContactFilters())}
            >
              Limpiar filtros
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
