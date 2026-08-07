import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { BoletasFiltersMenu } from '@/components/boletas/BoletasFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import { boletasListConfig } from '@/config/list-modules/boletas'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  countActiveBoletaFilters,
  type BoletaFilters,
} from '@/lib/boleta-filters'
import {
  BOLETA_LIST_SCOPE_OPTIONS,
  BOLETA_SCOPE_SHORT_LABELS,
  type BoletaListScope,
} from '@/lib/boleta-list-scope'
import {
  BOLETAS_MODULE_VIEW_OPTIONS,
  type BoletasModuleViewId,
} from '@/lib/module-list-views'

type BoletasModuleHeaderProps = {
  view: BoletasModuleViewId
  onViewChange: (view: BoletasModuleViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  filters: BoletaFilters
  onFiltersChange: (filters: BoletaFilters) => void
  listScope?: BoletaListScope
  onListScopeChange?: (scope: BoletaListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function BoletasModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  onCreateNew,
  filters,
  onFiltersChange,
  listScope = 'all',
  onListScopeChange,
  archivedCount = 0,
  toolbarEnd,
}: BoletasModuleHeaderProps) {
  const { canCreate } = useModulePermissions('boletas')
  const activeFilters = countActiveBoletaFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {boletasListConfig.title}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina boletas archivadas.'
              : boletasListConfig.description}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <BoletasFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <Button
              type="button"
              size="sm"
              className="size-8 shrink-0 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              onClick={onCreateNew}
              aria-label={boletasListConfig.newItemLabel}
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">{boletasListConfig.newItemLabel}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={BOLETAS_MODULE_VIEW_OPTIONS}
            tablistAriaLabel="Vista de boletas"
            archivedViewId="archivados"
            archivedCount={archivedCount}
            showLabel
          />
        }
        scopeSwitcher={
          showListScope ? (
            <ModuleListScopeSwitcher
              value={listScope}
              onChange={onListScopeChange}
              options={BOLETA_LIST_SCOPE_OPTIONS}
              shortLabels={BOLETA_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar boletas"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar boletas…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
