import { FolderKanban, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

type WorkboardEmptyStateProps = {
  readOnly: boolean
  onAddGroup: () => void
}

export function WorkboardEmptyState({ readOnly, onAddGroup }: WorkboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <FolderKanban aria-hidden className="size-7" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">Sin grupos en el plan</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Crea un grupo para comenzar (por ejemplo: «Kick-off», «Implementación» o «Go-live») y
        agrega actividades con horas y fechas.
      </p>
      {!readOnly ? (
        <Button type="button" size="sm" className="mt-5 gap-1.5" onClick={onAddGroup}>
          <Plus aria-hidden className="size-4" />
          Crear primer grupo
        </Button>
      ) : null}
    </div>
  )
}
