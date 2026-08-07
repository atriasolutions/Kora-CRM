import { Check, Filter } from 'lucide-react'

import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
import { CompactPeriodFilter } from '@/components/shared/CompactPeriodFilter'
import { SolicitudLookupField } from '@/components/shared/SolicitudLookupField'
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
  countActivePruebaSolicitudFilters,
  createDefaultPruebaSolicitudFilters,
  type PruebaSolicitudFilters,
} from '@/lib/prueba-solicitud-filters'
import {
  labelForListDateFilter,
  listDateToCompact,
  compactToListDate,
} from '@/lib/list-date-filter'
import { cn } from '@/lib/utils'

type PruebasSolicitudFiltersMenuProps = {
  filters: PruebaSolicitudFilters
  onFiltersChange: (filters: PruebaSolicitudFilters) => void
}

export function PruebasSolicitudFiltersMenu({
  filters,
  onFiltersChange,
}: PruebasSolicitudFiltersMenuProps) {
  const active = countActivePruebaSolicitudFilters(filters)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('gap-2 border-border shadow-sm', active > 0 && 'border-primary/40 bg-primary/5')}
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
        className="w-[min(100vw-2rem,22rem)] max-h-[70vh] overflow-y-auto p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel className="px-0">Fecha de actualización</DropdownMenuLabel>
        <p className="mb-2 px-0.5 text-xs text-muted-foreground">
          {labelForListDateFilter(filters.date)}
        </p>
        <CompactPeriodFilter
          idPrefix="pruebas-filter"
          modes={['all', 'month', 'year', 'custom']}
          value={listDateToCompact(filters.date)}
          onChange={(next) =>
            onFiltersChange({ ...filters, date: compactToListDate(next) })
          }
        />

        <DropdownMenuSeparator className="my-3" />
        <div className="space-y-4">
          <SolicitudLookupField
            value={filters.solicitudId}
            solicitudCode={filters.solicitudCode}
            solicitudTitle={filters.solicitudTitle}
            onChange={(solicitudId, solicitud) =>
              onFiltersChange({
                ...filters,
                solicitudId,
                solicitudCode: solicitud?.code ?? '',
                solicitudTitle: solicitud?.title ?? '',
              })
            }
          />
          <CompanyLookupField
            label="Empresa"
            value={filters.companyId}
            onChange={(companyId, company) =>
              onFiltersChange({
                ...filters,
                companyId,
                companyName: company?.name ?? '',
              })
            }
            searchPlaceholder="Filtrar por empresa…"
            helperText="Opcional. Muestra pruebas de solicitudes de esa empresa."
            presetCompany={
              filters.companyId && filters.companyName
                ? { id: filters.companyId, name: filters.companyName }
                : undefined
            }
          />
        </div>
        {active > 0 ? (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => onFiltersChange(createDefaultPruebaSolicitudFilters())}
            >
              <Check aria-hidden className="size-4" />
              Limpiar filtros
            </button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
