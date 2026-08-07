import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'

import { PruebasSolicitudFiltersMenu } from '@/components/pruebas-solicitud/PruebasSolicitudFiltersMenu'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import { pruebasSolicitudListConfig } from '@/config/list-modules/pruebas-solicitud'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  countActivePruebaSolicitudFilters,
  type PruebaSolicitudFilters,
} from '@/lib/prueba-solicitud-filters'
import {
  PRUEBAS_MODULE_VIEW_OPTIONS,
  type PruebasModuleViewId,
} from '@/lib/module-list-views'

type PruebasSolicitudModuleHeaderProps = {
  view: PruebasModuleViewId
  onViewChange: (view: PruebasModuleViewId) => void
  query: string
  onQueryChange: (query: string) => void
  filters: PruebaSolicitudFilters
  onFiltersChange: (filters: PruebaSolicitudFilters) => void
  onCreateNew?: () => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function PruebasSolicitudModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  onCreateNew,
  archivedCount = 0,
  toolbarEnd,
}: PruebasSolicitudModuleHeaderProps) {
  const { canCreate } = useModulePermissions('pruebas_solicitud')
  const activeFilters = countActivePruebaSolicitudFilters(filters)

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {pruebasSolicitudListConfig.title}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina pruebas archivadas.'
              : view === 'segmentos'
                ? 'Listas por estado de aprobación del cliente.'
                : pruebasSolicitudListConfig.description}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <PruebasSolicitudFiltersMenu
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          ) : null}
          {view !== 'archivados' && onCreateNew && canCreate ? (
            <Button
              type="button"
              size="sm"
              className="size-8 shrink-0 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              onClick={onCreateNew}
              aria-label={pruebasSolicitudListConfig.newItemLabel}
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">{pruebasSolicitudListConfig.newItemLabel}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ModuleViewSwitcher
            value={view}
            onChange={onViewChange}
            options={PRUEBAS_MODULE_VIEW_OPTIONS}
            tablistAriaLabel="Vista de pruebas de solicitud"
            archivedViewId="archivados"
            archivedCount={archivedCount}
            showLabel
          />
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar pruebas de solicitud"
            placeholder={
              view === 'archivados'
                ? 'Buscar en archivados…'
                : 'Buscar pruebas de solicitud…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={view === 'lista' ? toolbarEnd : undefined}
      />
    </section>
  )
}
