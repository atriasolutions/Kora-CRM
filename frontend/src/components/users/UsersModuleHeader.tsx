import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'

import { ModuleListScopeSwitcher } from '@/components/list/ModuleListScopeSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { UsersFiltersMenu } from '@/components/users/UsersFiltersMenu'
import { Button } from '@/components/ui/button'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { countActiveUserFilters, type UserFilters } from '@/lib/user-filters'
import {
  USER_LIST_SCOPE_OPTIONS,
  USER_SCOPE_SHORT_LABELS,
  type UserListScope,
} from '@/lib/user-list-scope'

type UsersModuleHeaderProps = {
  query: string
  onQueryChange: (query: string) => void
  onInvite: () => void
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
  listScope: UserListScope
  onListScopeChange: (scope: UserListScope) => void
  toolbarEnd?: ReactNode
}

export function UsersModuleHeader({
  query,
  onQueryChange,
  onInvite,
  filters,
  onFiltersChange,
  listScope,
  onListScopeChange,
  toolbarEnd,
}: UsersModuleHeaderProps) {
  const { can } = useMenuAccess()
  const canInvite = can('usuarios', 'create')
  const activeFilters = countActiveUserFilters(filters)

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Usuarios
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            Equipo, roles y accesos al CRM.
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <UsersFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          {canInvite ? (
            <Button
              size="sm"
              className="size-8 shrink-0 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
              onClick={onInvite}
              aria-label="Invitar usuario"
            >
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">Invitar usuario</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={null}
        scopeSwitcher={
          <ModuleListScopeSwitcher
            value={listScope}
            onChange={onListScopeChange}
            options={USER_LIST_SCOPE_OPTIONS}
            shortLabels={USER_SCOPE_SHORT_LABELS}
            showLabel
          />
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar usuarios"
            placeholder="Buscar por nombre, email o rol…"
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
