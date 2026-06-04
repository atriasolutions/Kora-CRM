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
  COMPANY_LAST_ACTIVITY_OPTIONS,
  COMPANY_LIFECYCLE_OPTIONS,
  COMPANY_OPERATIONAL_OPTIONS,
  countActiveCompanyFilters,
  createDefaultCompanyFilters,
  toggleCompanyLifecycle,
  type CompanyFilters,
} from '@/lib/company-filters'
import { cn } from '@/lib/utils'

type CompaniesFiltersMenuProps = {
  filters: CompanyFilters
  onFiltersChange: (filters: CompanyFilters) => void
}

export function CompaniesFiltersMenu({
  filters,
  onFiltersChange,
}: CompaniesFiltersMenuProps) {
  const activeCount = countActiveCompanyFilters(filters)

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
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Etapa del ciclo</DropdownMenuLabel>
        {COMPANY_LIFECYCLE_OPTIONS.map((lifecycle) => {
          const checked = filters.lifecycles.includes(lifecycle)
          return (
            <button
              key={lifecycle}
              type="button"
              className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => onFiltersChange(toggleCompanyLifecycle(filters, lifecycle))}
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded border border-border',
                  checked && 'border-primary bg-primary text-primary-foreground',
                )}
              >
                {checked ? <Check aria-hidden className="size-3" /> : null}
              </span>
              {lifecycle}
            </button>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Estado de cuenta</DropdownMenuLabel>
        <button
          type="button"
          className={cn(
            'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
            filters.operationalStatus === 'all' && 'bg-accent/60 font-medium',
          )}
          onClick={() => onFiltersChange({ ...filters, operationalStatus: 'all' })}
        >
          <span
            className={cn(
              'size-2 rounded-full border border-border',
              filters.operationalStatus === 'all' && 'border-primary bg-primary',
            )}
          />
          Todas
        </button>
        {COMPANY_OPERATIONAL_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={cn(
              'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
              filters.operationalStatus === value && 'bg-accent/60 font-medium',
            )}
            onClick={() => onFiltersChange({ ...filters, operationalStatus: value })}
          >
            <span
              className={cn(
                'size-2 rounded-full border border-border',
                filters.operationalStatus === value && 'border-primary bg-primary',
              )}
            />
            {label}
          </button>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Última actividad</DropdownMenuLabel>
        {COMPANY_LAST_ACTIVITY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={cn(
              'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
              filters.lastActivity === value && 'bg-accent/60 font-medium',
            )}
            onClick={() => onFiltersChange({ ...filters, lastActivity: value })}
          >
            <span
              className={cn(
                'size-2 rounded-full border border-border',
                filters.lastActivity === value && 'border-primary bg-primary',
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
              onClick={() => onFiltersChange(createDefaultCompanyFilters())}
            >
              Limpiar filtros
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
