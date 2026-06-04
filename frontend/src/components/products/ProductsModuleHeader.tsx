import type { ReactNode } from 'react'
import { ChevronDown, FileSpreadsheet, Plus } from 'lucide-react'

import { ProductsFiltersMenu } from '@/components/products/ProductsFiltersMenu'
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
import { countActiveProductFilters, type ProductFilters } from '@/lib/product-filters'
import {
  PRODUCT_LIST_SCOPE_OPTIONS,
  PRODUCT_SCOPE_SHORT_LABELS,
  type ProductListScope,
} from '@/lib/product-list-scope'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { StandardModuleViewId } from '@/lib/module-list-views'
import { STANDARD_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

export type ProductsViewId = StandardModuleViewId

type ProductsModuleHeaderProps = {
  view: ProductsViewId
  onViewChange: (view: ProductsViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  onDuplicate: () => void
  onImportCsv?: () => void
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
  listScope?: ProductListScope
  onListScopeChange?: (scope: ProductListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function ProductsModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  onCreateNew,
  onDuplicate,
  onImportCsv,
  filters,
  onFiltersChange,
  listScope = 'all',
  onListScopeChange,
  archivedCount = 0,
  toolbarEnd,
}: ProductsModuleHeaderProps) {
  const { canCreate } = useModulePermissions('productos')
  const activeFilters = countActiveProductFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Productos
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina productos archivados.'
              : 'Catálogo de planes, servicios y add-ons para ventas y cotizaciones.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <ProductsFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
                  aria-label="Nuevo producto"
                >
                  <Plus aria-hidden className="size-4" />
                  <span className="hidden md:inline">Nuevo producto</span>
                  <ChevronDown
                    aria-hidden
                    className="hidden size-4 opacity-70 md:inline"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={onCreateNew}>Crear nuevo</DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>Duplicar existente</DropdownMenuItem>
                {onImportCsv ? (
                  <DropdownMenuItem onSelect={onImportCsv}>
                    <FileSpreadsheet aria-hidden className="size-4" />
                    Importar CSV
                  </DropdownMenuItem>
                ) : null}
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
            tablistAriaLabel="Vista de productos"
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
              options={PRODUCT_LIST_SCOPE_OPTIONS}
              shortLabels={PRODUCT_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar productos"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar productos…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
