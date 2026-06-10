import { Check, Filter } from 'lucide-react'

import { CompanyLookupField } from '@/components/shared/CompanyLookupField'
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
  BITACORA_BILLABLE_OPTIONS,
  countActiveBitacoraFilters,
  createDefaultBitacoraFilters,
  type BitacoraFilters,
} from '@/lib/bitacora-filters'
import {
  bitacoraDateToCompact,
  compactToBitacoraDate,
  labelForBitacoraDateFilter,
} from '@/lib/bitacora-date-filter'
import { isGuestBitacoraDashboardLocked, type GuestCompanyRef } from '@/lib/bitacora-guest-scope'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

function RadioRow({
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
          'flex size-4 items-center justify-center rounded-full border border-border',
          checked && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {checked ? <Check aria-hidden className="size-2.5" /> : null}
      </span>
      {label}
    </button>
  )
}

type BitacoraFiltersMenuProps = {
  filters: BitacoraFilters
  onFiltersChange: (filters: BitacoraFilters) => void
  /** En dashboard no aplica el filtro de facturación. */
  variant?: 'list' | 'dashboard'
  guestCompany?: GuestCompanyRef | null
}

export function BitacoraFiltersMenu({
  filters,
  onFiltersChange,
  variant = 'list',
  guestCompany = null,
}: BitacoraFiltersMenuProps) {
  const { profile } = useAuth()
  const lockCompanyForGuest =
    variant === 'dashboard' && isGuestBitacoraDashboardLocked(profile)

  const active =
    variant === 'dashboard'
      ? countActiveBitacoraFilters(filters, { includeBillable: false })
      : countActiveBitacoraFilters(filters)

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
        className="w-80 overflow-visible p-3"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuLabel>Fecha de trabajo</DropdownMenuLabel>
        <p className="mb-2 px-0.5 text-xs text-muted-foreground">
          {labelForBitacoraDateFilter(filters.date)}
        </p>
        <CompactPeriodFilter
          idPrefix="bitacora-filter"
          modes={['all', 'month', 'year', 'custom']}
          value={bitacoraDateToCompact(filters.date)}
          onChange={(next) =>
            onFiltersChange({ ...filters, date: compactToBitacoraDate(next) })
          }
        />

        <DropdownMenuSeparator className="my-3" />
        <DropdownMenuLabel>Empresa</DropdownMenuLabel>
        <div className="px-0.5 pb-1" onPointerDown={(e) => e.stopPropagation()}>
          {lockCompanyForGuest ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Empresa</p>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {guestCompany?.name ?? 'Sin empresa configurada en tu perfil'}
              </div>
              <p className="text-xs text-muted-foreground">
                Como invitado, el dashboard solo muestra horas de tu empresa asignada.
              </p>
            </div>
          ) : (
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
              helperText="Opcional. Muestra registros vinculados a esa empresa."
              presetCompany={
                filters.companyId && filters.companyName
                  ? { id: filters.companyId, name: filters.companyName }
                  : undefined
              }
            />
          )}
        </div>

        {variant === 'list' ? (
          <>
            <DropdownMenuSeparator className="my-3" />
            <DropdownMenuLabel>Facturación</DropdownMenuLabel>
            {BITACORA_BILLABLE_OPTIONS.map((option) => (
              <RadioRow
                key={option.value}
                checked={filters.billable === option.value}
                label={option.label}
                onClick={() => onFiltersChange({ ...filters, billable: option.value })}
              />
            ))}
          </>
        ) : null}
        <DropdownMenuSeparator className="my-3" />
        <button
          type="button"
          className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => onFiltersChange(createDefaultBitacoraFilters())}
        >
          Limpiar filtros
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
