import {
  ChartGantt,
  GripVertical,
  LayoutList,
  Pencil,
  Plus,
  Table2,
  Trash2,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type WorkboardPlanView = 'table' | 'gantt' | 'hours'

type WorkboardPlanHeaderProps = {
  readOnly: boolean
  view: WorkboardPlanView
  onViewChange: (view: WorkboardPlanView) => void
  newGroupName: string
  onNewGroupNameChange: (value: string) => void
  onAddGroup: () => void
  groupCount: number
  itemCount: number
}

export function WorkboardPlanHeader({
  readOnly,
  view,
  onViewChange,
  newGroupName,
  onNewGroupNameChange,
  onAddGroup,
  groupCount,
  itemCount,
}: WorkboardPlanHeaderProps) {
  const submitGroup = () => {
    if (!newGroupName.trim()) return
    onAddGroup()
  }

  return (
    <div className="space-y-3 border-b border-border bg-muted/15 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <LayoutList aria-hidden className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">Plan de trabajo</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {groupCount === 0
                ? 'Organiza actividades en grupos (fases, sprints o entregables).'
                : `${groupCount} grupo${groupCount === 1 ? '' : 's'} · ${itemCount} actividad${itemCount === 1 ? '' : 'es'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-sm"
            role="tablist"
            aria-label="Vista del plan"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'table'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onViewChange('table')}
            >
              <Table2 aria-hidden className="size-3.5" />
              Tabla
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'gantt'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'gantt'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onViewChange('gantt')}
            >
              <ChartGantt aria-hidden className="size-3.5" />
              Gantt
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'hours'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'hours'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onViewChange('hours')}
            >
              <Users aria-hidden className="size-3.5" />
              Horas por persona
            </button>
          </div>
        </div>

        {!readOnly ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <Input
              placeholder="Nombre del nuevo grupo…"
              className="h-9 flex-1 bg-background shadow-sm sm:min-w-[200px]"
              value={newGroupName}
              onChange={(e) => onNewGroupNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitGroup()
              }}
            />
            <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={submitGroup}>
              <Plus aria-hidden className="size-4" />
              Agregar grupo
            </Button>
          </div>
        ) : null}
      </div>

      {!readOnly && view === 'table' ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-dashed border-border/80 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <GripVertical aria-hidden className="size-3.5 shrink-0" />
            Arrastra con ⋮⋮
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Pencil aria-hidden className="size-3.5 shrink-0" />
            Clic en celda para editar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Trash2 aria-hidden className="size-3.5 shrink-0" />
            Papelera al final de la fila
          </span>
        </div>
      ) : null}
    </div>
  )
}
