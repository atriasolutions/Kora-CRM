import type { ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'

import { QuotesFiltersMenu } from '@/components/quotes/QuotesFiltersMenu'
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
import { countActiveQuoteFilters, type QuoteFilters } from '@/lib/quote-filters'
import {
  QUOTE_LIST_SCOPE_OPTIONS,
  QUOTE_SCOPE_SHORT_LABELS,
  type QuoteListScope,
} from '@/lib/quote-list-scope'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { StandardModuleViewId } from '@/lib/module-list-views'
import { STANDARD_MODULE_VIEW_OPTIONS } from '@/lib/module-list-views'

export type QuotesViewId = StandardModuleViewId

type QuotesModuleHeaderProps = {
  view: QuotesViewId
  onViewChange: (view: QuotesViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  filters: QuoteFilters
  onFiltersChange: (filters: QuoteFilters) => void
  listScope?: QuoteListScope
  onListScopeChange?: (scope: QuoteListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function QuotesModuleHeader({
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
}: QuotesModuleHeaderProps) {
  const { canCreate } = useModulePermissions('cotizaciones')
  const activeFilters = countActiveQuoteFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Cotizaciones
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina cotizaciones archivadas.'
              : 'Propuestas comerciales vinculadas a oportunidades.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <QuotesFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
                  aria-label="Nueva cotización"
                >
                  <Plus aria-hidden className="size-4" />
                  <span className="hidden md:inline">Nueva cotización</span>
                  <ChevronDown
                    aria-hidden
                    className="hidden size-4 opacity-70 md:inline"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={onCreateNew}>Crear nueva</DropdownMenuItem>
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
            tablistAriaLabel="Vista de cotizaciones"
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
              options={QUOTE_LIST_SCOPE_OPTIONS}
              shortLabels={QUOTE_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar cotizaciones"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar cotizaciones…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
