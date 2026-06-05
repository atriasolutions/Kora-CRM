import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import { WorkboardDragHandle } from '@/components/projects/workboard/WorkboardDragHandle'
import { WorkboardItemTree } from '@/components/projects/workboard/WorkboardItemTree'
import { WORKBOARD_COLUMN_COUNT } from '@/components/projects/workboard/workboard-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addItem,
  deleteGroup,
  groupTotals,
  renameGroup,
  toggleGroupCollapsed,
  topLevelInGroup,
} from '@/lib/project-work-plan'
import type { WorkPlanPersistOptions } from '@/lib/project-work-plan'
import type { ProjectWorkGroup, ProjectWorkPlan } from '@/types/project-work-plan'
import { cn } from '@/lib/utils'

const GROUP_ACCENT: Record<ProjectWorkGroup['accent'], string> = {
  'chart-1': 'border-l-[hsl(var(--chart-1))]',
  'chart-2': 'border-l-[hsl(var(--chart-2))]',
  'chart-3': 'border-l-[hsl(var(--chart-3))]',
  'chart-4': 'border-l-[hsl(var(--chart-4))]',
  'chart-5': 'border-l-[hsl(var(--chart-5))]',
}

type WorkboardGroupSectionProps = {
  group: ProjectWorkGroup
  plan: ProjectWorkPlan
  readOnly: boolean
  onChange: (plan: ProjectWorkPlan, options?: WorkPlanPersistOptions) => void
  expandedParents: Set<string>
  onToggleParent: (id: string) => void
  teamMemberNames?: string[]
}

export function WorkboardGroupSection({
  group,
  plan,
  readOnly,
  onChange,
  expandedParents,
  onToggleParent,
  teamMemberNames,
}: WorkboardGroupSectionProps) {
  const totals = groupTotals(plan, group.id)

  const topLevel = topLevelInGroup(plan, group.id)
  const topLevelIds = useMemo(
    () => topLevel.map((i) => `item:${i.id}`),
    [topLevel],
  )

  const sortableId = `group:${group.id}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tbody
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'relative z-10 opacity-70')}
      data-workboard-group={group.id}
    >
      <tr
        className={cn(
          'border-l-4 bg-muted/25',
          GROUP_ACCENT[group.accent],
          isDragging && 'ring-2 ring-primary/30',
        )}
      >
        <td colSpan={WORKBOARD_COLUMN_COUNT} className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-background/70 px-2 py-1.5 shadow-sm ring-1 ring-border/60">
            {!readOnly ? (
              <WorkboardDragHandle
                listeners={listeners}
                attributes={attributes}
                label={`Arrastrar grupo ${group.name}`}
              />
            ) : null}
            <button
              type="button"
              className="grid size-7 place-items-center rounded-md hover:bg-muted"
              onClick={() => onChange(toggleGroupCollapsed(plan, group.id))}
            >
              {group.collapsed ? (
                <ChevronRight aria-hidden className="size-4" />
              ) : (
                <ChevronDown aria-hidden className="size-4" />
              )}
            </button>
            {!readOnly ? (
              <Input
                className="h-8 max-w-xs border-transparent bg-transparent font-semibold shadow-none focus-visible:border-input"
                value={group.name}
                onChange={(e) => onChange(renameGroup(plan, group.id, e.target.value))}
              />
            ) : (
              <span className="font-semibold">{group.name}</span>
            )}
            <span className="rounded-md bg-muted/80 px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {totals.done}/{totals.total} completadas · {totals.statusPct}% avance ·{' '}
              {totals.actualHours}/{totals.estimatedHours} h
            </span>
            <div className="ms-auto flex items-center gap-1">
              {!readOnly ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => onChange(addItem(plan, group.id, null))}
                  >
                    <Plus aria-hidden className="size-3.5" />
                    Actividad
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    aria-label={`Eliminar grupo ${group.name}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Eliminar el grupo «${group.name}» y sus actividades?`,
                        )
                      ) {
                        onChange(deleteGroup(plan, group.id))
                      }
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </td>
      </tr>
      {!group.collapsed ? (
        <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
          {topLevel.map((item) => (
            <WorkboardItemTree
              key={item.id}
              plan={plan}
              item={item}
              depth={0}
              readOnly={readOnly}
              onChange={onChange}
              expandedParents={expandedParents}
              onToggleParent={onToggleParent}
              teamMemberNames={teamMemberNames}
            />
          ))}
          {!readOnly ? (
            <tr>
              <td colSpan={WORKBOARD_COLUMN_COUNT} className="border-b border-border py-2">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md ps-10 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => onChange(addItem(plan, group.id, null))}
                >
                  <Plus aria-hidden className="size-4" />
                  Agregar actividad al grupo
                </button>
              </td>
            </tr>
          ) : null}
        </SortableContext>
      ) : null}
    </tbody>
  )
}
