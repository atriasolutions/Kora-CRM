import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { PurchasesFiltersMenu } from '@/components/purchases/PurchasesFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import {
  countActivePurchaseFilters,
  type PurchaseFilters,
} from '@/lib/purchase-filters'
import {
  PURCHASE_LIST_SCOPE_OPTIONS,
  PURCHASE_SCOPE_SHORT_LABELS,
  type PurchaseListScope,
} from '@/lib/purchase-list-scope'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { StandardModuleViewId } from '@/lib/module-list-views'
import { STANDARD_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

export type PurchasesViewId = StandardModuleViewId

type PurchasesModuleHeaderProps = {
  view: PurchasesViewId
  onViewChange: (view: PurchasesViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew?: () => void
  filters: PurchaseFilters
  onFiltersChange: (filters: PurchaseFilters) => void
  listScope?: PurchaseListScope
  onListScopeChange?: (scope: PurchaseListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function PurchasesModuleHeader({
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
}: PurchasesModuleHeaderProps) {
  const { canCreate } = useModulePermissions('compras')
  const activeFilters = countActivePurchaseFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Compras
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina órdenes archivadas.'
              : 'Registra órdenes de compra a proveedores y productos adquiridos.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <PurchasesFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <Button
              size="sm"
              className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              aria-label="Nueva compra"
              onClick={onCreateNew}
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">Nueva compra</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={STANDARD_MODULE_VIEW_OPTIONS}
            tablistAriaLabel="Vista de compras"
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
              options={PURCHASE_LIST_SCOPE_OPTIONS}
              shortLabels={PURCHASE_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar compras"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar compras…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
