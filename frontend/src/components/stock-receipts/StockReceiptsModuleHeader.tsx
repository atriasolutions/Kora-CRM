import type { ReactNode } from 'react'
import { ChevronDown, FileSpreadsheet, Plus } from 'lucide-react'

import { StockReceiptsFiltersMenu } from '@/components/stock-receipts/StockReceiptsFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  countActiveStockReceiptFilters,
  type StockReceiptFilters,
} from '@/lib/stock-receipt-filters'
import {
  STOCK_RECEIPT_LIST_SCOPE_OPTIONS,
  STOCK_RECEIPT_SCOPE_SHORT_LABELS,
  type StockReceiptListScope,
} from '@/lib/stock-receipt-list-scope'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { StandardModuleViewId } from '@/lib/module-list-views'
import { STANDARD_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

export type StockReceiptsViewId = StandardModuleViewId

type StockReceiptsModuleHeaderProps = {
  view: StockReceiptsViewId
  onViewChange: (view: StockReceiptsViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew?: () => void
  onImportCsv?: () => void
  filters: StockReceiptFilters
  onFiltersChange: (filters: StockReceiptFilters) => void
  listScope?: StockReceiptListScope
  onListScopeChange?: (scope: StockReceiptListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function StockReceiptsModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  onCreateNew,
  onImportCsv,
  filters,
  onFiltersChange,
  listScope = 'all',
  onListScopeChange,
  archivedCount = 0,
  toolbarEnd,
}: StockReceiptsModuleHeaderProps) {
  const { canCreate } = useModulePermissions('ingresos')
  const activeFilters = countActiveStockReceiptFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Ingresos
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera: restaura o elimina ingresos archivados.'
              : 'Ingresos de stock a bodega desde OC o referencia externa.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <StockReceiptsFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
                  aria-label="Nuevo ingreso"
                >
                  <Plus aria-hidden className="size-4" />
                  <span className="hidden md:inline">Nuevo ingreso</span>
                  <ChevronDown
                    aria-hidden
                    className="hidden size-4 opacity-70 md:inline"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={onCreateNew}>Crear ingreso</DropdownMenuItem>
                <DropdownMenuItem onSelect={onImportCsv}>
                  <FileSpreadsheet aria-hidden className="size-4" />
                  Importar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={STANDARD_MODULE_VIEW_OPTIONS}
            tablistAriaLabel="Vista de ingresos"
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
              options={STOCK_RECEIPT_LIST_SCOPE_OPTIONS}
              shortLabels={STOCK_RECEIPT_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar ingresos"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar ingresos…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
