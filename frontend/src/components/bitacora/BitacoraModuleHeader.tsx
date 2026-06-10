import type { ReactNode } from 'react'
import { BarChart3, List, Plus } from 'lucide-react'

import { BitacoraFiltersMenu } from '@/components/bitacora/BitacoraFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import type { ModuleViewOption } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import {
  countActiveBitacoraDashboardFilters,
  countActiveBitacoraFilters,
  type BitacoraFilters,
} from '@/lib/bitacora-filters'
import type { GuestCompanyRef } from '@/lib/bitacora-guest-scope'
import {
  BITACORA_SCOPE_SHORT_LABELS,
  bitacoraListScopeOptionsForProfile,
  type BitacoraListScope,
} from '@/lib/bitacora-list-scope'
import { useAuth } from '@/hooks/use-auth'
import { useModulePermissions } from '@/hooks/use-module-permissions'

export type BitacoraViewId = 'lista' | 'dashboard'

const BITACORA_VIEW_OPTIONS: ModuleViewOption<BitacoraViewId>[] = [
  {
    id: 'lista',
    label: 'Lista',
    description: 'Tabla con columnas y paginación',
    Icon: List,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Resumen visual de horas para presentar al cliente',
    Icon: BarChart3,
  },
]

type BitacoraModuleHeaderProps = {
  view: BitacoraViewId
  onViewChange: (view: BitacoraViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  filters: BitacoraFilters
  onFiltersChange: (filters: BitacoraFilters) => void
  listScope: BitacoraListScope
  onListScopeChange: (scope: BitacoraListScope) => void
  guestCompany?: GuestCompanyRef | null
  toolbarEnd?: ReactNode
}

export function BitacoraModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  onCreateNew,
  filters,
  onFiltersChange,
  listScope,
  onListScopeChange,
  guestCompany = null,
  toolbarEnd,
}: BitacoraModuleHeaderProps) {
  const { profile } = useAuth()
  const { canCreate } = useModulePermissions('bitacora')
  const scopeOptions = bitacoraListScopeOptionsForProfile(profile)
  const activeFilters =
    view === 'dashboard'
      ? countActiveBitacoraDashboardFilters(filters)
      : countActiveBitacoraFilters(filters)

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Bitácora
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'dashboard'
              ? 'Dashboard de horas facturables y no facturables, listo para compartir con el cliente.'
              : 'Registro de horas invertidas en solicitudes del equipo.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <BitacoraFiltersMenu
            filters={filters}
            onFiltersChange={onFiltersChange}
            variant={view === 'dashboard' ? 'dashboard' : 'list'}
            guestCompany={guestCompany}
          />
          {canCreate ? (
            <Button
              size="sm"
              className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              onClick={onCreateNew}
              aria-label="Nueva bitácora"
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">Nueva bitácora</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={BITACORA_VIEW_OPTIONS}
            tablistAriaLabel="Vista de bitácora"
            showLabel
          />
        }
        scopeSwitcher={
          <ModuleListScopeSwitcher
            value={view === 'dashboard' && listScope === 'recent' ? 'all' : listScope}
            onChange={onListScopeChange}
            options={
              view === 'dashboard'
                ? scopeOptions.filter((option) => option.id !== 'recent')
                : scopeOptions
            }
            shortLabels={BITACORA_SCOPE_SHORT_LABELS}
            showLabel
          />
        }
        search={
          view === 'lista' ? (
            <ModuleSearchField
              value={query}
              onChange={onQueryChange}
              ariaLabel="Buscar bitácora"
              placeholder="Buscar bitácora…"
              className="relative w-full"
            />
          ) : undefined
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
