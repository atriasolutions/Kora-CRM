import type { ReactNode } from 'react'
import { ChevronDown, Plus } from 'lucide-react'

import { ContactsFiltersMenu } from '@/components/contacts/ContactsFiltersMenu'
import { ContactsListScopeSwitcher } from '@/components/contacts/ContactsListScopeSwitcher'
import { ContactsViewSwitcher } from '@/components/contacts/ContactsViewSwitcher'
import { ModuleListToolbarBar } from '@/components/list/ModuleListToolbarBar'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ContactFilters } from '@/lib/contact-filters'
import { countActiveContactFilters } from '@/lib/contact-filters'
import type { ContactListScope } from '@/lib/contact-list-scope'
import type { ContactsViewId } from '@/lib/contacts-views'
import { useModulePermissions } from '@/hooks/use-module-permissions'

export type { ContactsViewId } from '@/lib/contacts-views'

type ContactsModuleHeaderProps = {
  view: ContactsViewId
  onViewChange: (view: ContactsViewId) => void
  query: string
  onQueryChange: (query: string) => void
  onCreateNew: () => void
  onDuplicate: () => void
  /** Importación CSV (deshabilitada de momento si se omite). */
  onImportFile?: () => void
  filters: ContactFilters
  onFiltersChange: (filters: ContactFilters) => void
  listScope?: ContactListScope
  onListScopeChange?: (scope: ContactListScope) => void
  archivedCount?: number
  toolbarEnd?: ReactNode
}

export function ContactsModuleHeader({
  view,
  onViewChange,
  query,
  onQueryChange,
  onCreateNew,
  onDuplicate,
  onImportFile,
  filters,
  onFiltersChange,
  listScope = 'all',
  onListScopeChange,
  archivedCount = 0,
  toolbarEnd,
}: ContactsModuleHeaderProps) {
  const { canCreate } = useModulePermissions('contactos')
  const activeFilters = countActiveContactFilters(filters)
  const showListScope = view !== 'archivados' && onListScopeChange != null

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="flex items-start justify-between gap-3 md:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Contactos
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Papelera de reciclaje: restaura o elimina contactos archivados.'
              : 'Gestiona relaciones comerciales y seguimiento.'}
            {activeFilters > 0
              ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'} activo${activeFilters === 1 ? '' : 's'}`
              : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view !== 'archivados' ? (
            <ContactsFiltersMenu filters={filters} onFiltersChange={onFiltersChange} />
          ) : null}
          {view !== 'archivados' && canCreate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="size-8 px-0 shadow-sm md:h-9 md:w-auto md:px-4"
                  aria-label="Nuevo contacto"
                >
                  <Plus aria-hidden className="size-4" />
                  <span className="hidden md:inline">Nuevo contacto</span>
                  <ChevronDown
                    aria-hidden
                    className="hidden size-4 opacity-70 md:inline"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={onCreateNew}>Crear nuevo</DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>Duplicar existente</DropdownMenuItem>
                {onImportFile ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onImportFile}>
                      Importar archivo
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <ModuleListToolbarBar
        viewSwitcher={
          <ContactsViewSwitcher
            value={view}
            onChange={onViewChange}
            archivedCount={archivedCount}
            showLabel
          />
        }
        scopeSwitcher={
          showListScope ? (
            <ContactsListScopeSwitcher
              value={listScope}
              onChange={onListScopeChange}
              showLabel
            />
          ) : undefined
        }
        search={
          <ModuleSearchField
            value={query}
            onChange={onQueryChange}
            ariaLabel="Buscar contactos"
            placeholder={
              view === 'archivados' ? 'Buscar en archivados…' : 'Buscar contactos…'
            }
            className="relative w-full"
          />
        }
        toolbarEnd={toolbarEnd}
      />
    </section>
  )
}
