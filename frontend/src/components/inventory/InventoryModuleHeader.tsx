import type { ReactNode } from 'react'

import { InventoryFiltersMenu } from '@/components/inventory/InventoryFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import {
  countActiveInventoryFilters,
  type InventoryFilters,
} from '@/lib/inventory-filters'
import {
  INVENTORY_LIST_SCOPE_OPTIONS,
  INVENTORY_SCOPE_SHORT_LABELS,
  type InventoryListScope,
} from '@/lib/inventory-list-scope'
import type { InventoryModuleViewId } from '@/lib/module-list-views'
import { INVENTORY_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

export type InventoryViewId = InventoryModuleViewId

type InventoryModuleHeaderProps = {
  view: InventoryViewId
  onViewChange: (view: InventoryViewId) => void
  query: string
  onQueryChange: (query: string) => void
  filters: InventoryFilters
  onFiltersChange: (filters: InventoryFilters) => void
  listScope?: InventoryListScope
  onListScopeChange?: (scope: InventoryListScope) => void
  toolbarEnd?: ReactNode
}

export function InventoryModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  listScope = 'all',
  onListScopeChange,
  toolbarEnd,
}: InventoryModuleHeaderProps) {
  const activeFilters = countActiveInventoryFilters(filters)
  const showListScope = onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Inventario
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            Control de stock por ubicación. Entradas desde Ingresos y salidas desde Facturas emitidas.
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <InventoryFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={INVENTORY_MODULE_VIEW_OPTIONS}
            tablistAriaLabel="Vista de inventario"
            showLabel
          />
        }
        scopeSwitcher={
          showListScope ? (
            <ModuleListScopeSwitcher
              value={listScope}
              onChange={onListScopeChange}
              options={INVENTORY_LIST_SCOPE_OPTIONS}
              shortLabels={INVENTORY_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar inventario"
            placeholder="Buscar por producto o SKU…"
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
