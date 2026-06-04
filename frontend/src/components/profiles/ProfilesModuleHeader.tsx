import { Plus, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ModuleSearchField } from '@/components/list/ModuleSearchField'
import { useMenuAccess } from '@/hooks/use-menu-access'

type ProfilesModuleHeaderProps = {
  query: string
  onQueryChange: (q: string) => void
  onCreate: () => void
  toolbarEnd?: React.ReactNode
}

export function ProfilesModuleHeader({
  query,
  onQueryChange,
  onCreate,
  toolbarEnd,
}: ProfilesModuleHeaderProps) {
  const { can } = useMenuAccess()
  const canCreate = can('perfiles', 'create')

  return (
    <header className="shrink-0 border-b border-border bg-card px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Shield aria-hidden className="size-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Perfiles
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Perfiles de acceso con permisos por menú: visualización, creación, edición y
            eliminación.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Button type="button" size="sm" onClick={onCreate}>
              <Plus aria-hidden className="size-4" />
              Nuevo perfil
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ModuleSearchField
          value={query}
          onChange={onQueryChange}
          placeholder="Buscar perfiles…"
          ariaLabel="Buscar perfiles"
          className="max-w-md flex-1"
        />
        {toolbarEnd}
      </div>
    </header>
  )
}
