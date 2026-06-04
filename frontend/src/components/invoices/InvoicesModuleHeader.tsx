import type { ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'

import { InvoicesFiltersMenu } from '@/components/invoices/InvoicesFiltersMenu'
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
  countActiveInvoiceFilters,
  type InvoiceFilters,
} from '@/lib/invoice-filters'
import {
  INVOICE_LIST_SCOPE_OPTIONS,
  INVOICE_SCOPE_SHORT_LABELS,
  type InvoiceListScope,
} from '@/lib/invoice-list-scope'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { StandardModuleViewId } from '@/lib/module-list-views'
import { STANDARD_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

export type InvoicesViewId = StandardModuleViewId

type InvoicesModuleHeaderProps = {
  view: InvoicesViewId
  onViewChange: (view: InvoicesViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  onDuplicate: () => void
  filters: InvoiceFilters
  onFiltersChange: (filters: InvoiceFilters) => void
  listScope?: InvoiceListScope
  onListScopeChange?: (scope: InvoiceListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function InvoicesModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  onCreateNew,
  onDuplicate,
  filters,
  onFiltersChange,
  listScope = 'all',
  onListScopeChange,
  archivedCount = 0,
  toolbarEnd,
}: InvoicesModuleHeaderProps) {
  const { canCreate } = useModulePermissions('facturacion')
  const activeFilters = countActiveInvoiceFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Facturación
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina facturas archivadas.'
              : 'Facturas emitidas, cobros pendientes y seguimiento de pagos.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <InvoicesFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
                  aria-label="Nueva factura"
                >
                  <Plus aria-hidden className="size-4" />
                  <span className="hidden md:inline">Nueva factura</span>
                  <ChevronDown
                    aria-hidden
                    className="hidden size-4 opacity-70 md:inline"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={onCreateNew}>Crear nueva</DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>Duplicar existente</DropdownMenuItem>
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
            tablistAriaLabel="Vista de facturación"
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
              options={INVOICE_LIST_SCOPE_OPTIONS}
              shortLabels={INVOICE_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar facturas"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar facturas…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
