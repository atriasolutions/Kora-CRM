import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { ReportFieldDef } from '@/types/report-table'
import { cn } from '@/lib/utils'

type ReportSortableColumnsProps = {
  columnIds: string[]
  fields: ReportFieldDef[]
  onChange: (columnIds: string[]) => void
  onToggleField: (fieldId: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}

function SortableColumnRow({
  field,
  onRemove,
}: {
  field: ReportFieldDef
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex min-h-7 items-center gap-1 rounded-md border border-border bg-muted/40 px-1 py-0.5 text-xs leading-tight',
        isDragging && 'z-10 opacity-95 shadow-md ring-1 ring-primary/25',
      )}
    >
      <button
        type="button"
        className="grid size-6 shrink-0 cursor-grab place-items-center rounded text-muted-foreground touch-none hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`Reordenar columna ${field.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="size-3.5" />
      </button>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {field.label}
      </span>
      <button
        type="button"
        className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Quitar columna ${field.label}`}
        onClick={onRemove}
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </li>
  )
}

export function ReportSortableColumns({
  columnIds,
  fields,
  onChange,
  onToggleField,
  onSelectAll,
  onClearAll,
}: ReportSortableColumnsProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const fieldById = useMemo(
    () => new Map(fields.map((f) => [f.id, f])),
    [fields],
  )

  const orderedSelected = useMemo(
    () =>
      columnIds
        .map((id) => fieldById.get(id))
        .filter((f): f is ReportFieldDef => Boolean(f)),
    [columnIds, fieldById],
  )

  const unselected = useMemo(
    () => fields.filter((f) => !columnIds.includes(f.id)),
    [columnIds, fields],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = columnIds.indexOf(String(active.id))
    const newIndex = columnIds.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(columnIds, oldIndex, newIndex))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Columnas
          </h3>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Arrastra el asa para ordenar. Añade o quita desde la lista compacta inferior.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-primary hover:bg-muted"
            onClick={onSelectAll}
          >
            Todas
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted',
              columnIds.length === 0
                ? 'cursor-not-allowed opacity-45'
                : 'text-muted-foreground hover:text-destructive',
            )}
            disabled={columnIds.length === 0}
            onClick={onClearAll}
          >
            Quitar todas
          </button>
        </div>
      </div>

      {orderedSelected.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={columnIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="max-h-44 space-y-0.5 overflow-y-auto pr-0.5" aria-label="Orden de columnas del reporte">
              {orderedSelected.map((field) => (
                <SortableColumnRow
                  key={field.id}
                  field={field}
                  onRemove={() => onToggleField(field.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-muted/15 px-2 py-2 text-center text-[11px] text-muted-foreground">
          Sin columnas en la tabla. Pulsa campos abajo o «Todas». Al ejecutar, si sigue vacío se usan las columnas por defecto de la fuente.
        </p>
      )}

      {unselected.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">
            Campos disponibles ({unselected.length})
          </p>
          <ScrollArea className="max-h-28 rounded-md border border-border bg-muted/10">
            <div className="flex flex-wrap gap-1 p-1.5">
              {unselected.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => onToggleField(field.id)}
                  title={field.label}
                  className="max-w-full truncate rounded border border-border/80 bg-background px-1.5 py-0.5 text-[11px] font-medium leading-none text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  + {field.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : null}

      {activeId ? (
        <p className="sr-only" aria-live="polite">
          Reordenando columna
        </p>
      ) : null}
    </div>
  )
}
