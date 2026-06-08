import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { SolicitudesFiltersMenu } from '@/components/solicitudes/SolicitudesFiltersMenu'
import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { ModuleViewSwitcher } from '@/components/list/ModuleViewSwitcher'
import { Button } from '@/components/ui/button'
import {
  SOLICITUD_SCOPE_SHORT_LABELS,
  solicitudListScopeOptionsForProfile,
  type SolicitudListScope,
} from '@/lib/solicitud-list-scope'
import {
  countActiveSolicitudFilters,
  type SolicitudFilters,
} from '@/lib/solicitud-filters'
import { useAuth } from '@/hooks/use-auth'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { STANDARD_MODULE_VIEW_OPTIONS, type StandardModuleViewId } from '@/lib/module-list-views'

type SolicitudesModuleHeaderProps = {
  view: StandardModuleViewId
  onViewChange: (view: StandardModuleViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  filters: SolicitudFilters
  onFiltersChange: (filters: SolicitudFilters) => void
  listScope?: SolicitudListScope
  onListScopeChange?: (scope: SolicitudListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function SolicitudesModuleHeader({
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
}: SolicitudesModuleHeaderProps) {
  const { profile } = useAuth()
  const { canCreate } = useModulePermissions('solicitudes')
  const scopeOptions = solicitudListScopeOptionsForProfile(profile)
  const showListScope = view !== 'archivados' && onListScopeChange != null
  const activeFilters = countActiveSolicitudFilters(filters)

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Solicitudes
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina solicitudes archivadas.'
              : view === 'kanban'
                ? 'Tarjetas agrupadas por etapa del ciclo de vida.'
                : view === 'segmentos'
                  ? 'Listas dinámicas por prioridad, estado y responsable.'
                  : 'Peticiones internas, seguimiento y entrega a clientes.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <SolicitudesFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <Button
              size="sm"
              className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              aria-label="Nueva solicitud"
              onClick={onCreateNew}
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">Nueva solicitud</span>
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
            tablistAriaLabel="Vista de solicitudes"
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
              options={scopeOptions}
              shortLabels={SOLICITUD_SCOPE_SHORT_LABELS}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar solicitudes"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar solicitudes…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
