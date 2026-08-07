import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { GastosFiltersMenu } from '@/components/gastos/GastosFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import { gastosListConfig } from '@/config/list-modules/gastos'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  countActiveExpenseFilters,
  type ExpenseFilters,
} from '@/lib/expense-filters'
import {
  EXPENSE_LIST_SCOPE_OPTIONS,
  EXPENSE_SCOPE_SHORT_LABELS,
  type ExpenseListScope,
} from '@/lib/expense-list-scope'
import {
  GASTOS_MODULE_VIEW_OPTIONS,
  type GastosModuleViewId,
} from '@/lib/module-list-views'

type GastosModuleHeaderProps = {
  view: GastosModuleViewId
  onViewChange: (view: GastosModuleViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  filters: ExpenseFilters
  onFiltersChange: (filters: ExpenseFilters) => void
  listScope?: ExpenseListScope
  onListScopeChange?: (scope: ExpenseListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function GastosModuleHeader({
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
}: GastosModuleHeaderProps) {
  const { canCreate } = useModulePermissions('gastos')
  const activeFilters = countActiveExpenseFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {gastosListConfig.title}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina gastos archivados.'
              : gastosListConfig.description}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <GastosFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <Button
              type="button"
              size="sm"
              className="size-8 shrink-0 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              onClick={onCreateNew}
              aria-label={gastosListConfig.newItemLabel}
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">{gastosListConfig.newItemLabel}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={GASTOS_MODULE_VIEW_OPTIONS}
            tablistAriaLabel="Vista de gastos"
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
              options={EXPENSE_LIST_SCOPE_OPTIONS}
              shortLabels={EXPENSE_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar gastos"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar gastos…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
