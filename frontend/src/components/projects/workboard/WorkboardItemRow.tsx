import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Fragment } from 'react'

import { WorkboardAssigneeCell } from '@/components/projects/workboard/WorkboardAssigneeCell'
import { WorkboardStatusCell } from '@/components/projects/workboard/WorkboardStatusCell'
import { WorkboardDescriptionCell } from '@/components/projects/workboard/WorkboardDescriptionCell'
import { WorkboardDragHandle } from '@/components/projects/workboard/WorkboardDragHandle'
import { WorkboardEditableCell } from '@/components/projects/workboard/WorkboardEditableCell'
import {
  WORKBOARD_COLUMN_COUNT,
  workboardTdClass,
} from '@/components/projects/workboard/workboard-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  applyWorkItemDateChange,
  childrenOf,
  deleteItem,
  formatDisplayDate,
  isItemDone,
  isItemOverdue,
  formatWorkboardHoursDisplay,
  itemDelayDays,
  parseWorkboardHoursInput,
  updateItem,
  type WorkItemDateField,
} from '@/lib/project-work-plan'
import { toast } from '@/lib/toast'
import { workItemStatusRowClass } from '@/lib/project-work-status'
import type { WorkPlanPersistOptions } from '@/lib/project-work-plan'
import type { ProjectWorkItem, ProjectWorkPlan } from '@/types/project-work-plan'
import { cn } from '@/lib/utils'

type WorkboardItemRowProps = {
  plan: ProjectWorkPlan
  item: ProjectWorkItem
  depth: 0 | 1
  readOnly: boolean
  expanded: boolean
  onToggleExpand: () => void
  onChange: (plan: ProjectWorkPlan, options?: WorkPlanPersistOptions) => void
  dragDisabled?: boolean
  teamMemberNames?: string[]
}

export function WorkboardItemRow({
  plan,
  item,
  depth,
  readOnly,
  expanded,
  onToggleExpand,
  onChange,
  dragDisabled = false,
  teamMemberNames,
}: WorkboardItemRowProps) {
  const kids = childrenOf(plan, item.id)
  const hasKids = kids.length > 0
  const overdue = isItemOverdue(item)
  const done = isItemDone(item)
  const delay = itemDelayDays(item)

  const sortableId = `item:${item.id}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    disabled: readOnly || dragDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const patchItem = (
    patch: Partial<ProjectWorkItem>,
    options?: WorkPlanPersistOptions,
  ) => {
    onChange(updateItem(plan, item.id, patch), options)
  }

  const saveDate = (field: WorkItemDateField, value: string) => {
    const result = applyWorkItemDateChange(item, field, value)
    if ('error' in result) {
      toast.warning(result.error)
      return
    }
    patchItem(result.item)
  }

  const handleDelete = () => {
    const msg = hasKids
      ? `¿Eliminar «${item.name}» y sus ${kids.length} subactividad(es)?`
      : `¿Eliminar «${item.name}»?`
    if (window.confirm(msg)) onChange(deleteItem(plan, item.id))
  }

  return (
    <Fragment>
      <tr
        ref={setNodeRef}
        style={style}
        className={cn(
          'transition-colors hover:bg-muted/25',
          workItemStatusRowClass(item.status),
          depth === 1 && 'bg-muted/10',
          overdue &&
            !done &&
            item.status !== 'completado' &&
            'bg-amber-50/90 dark:bg-amber-950/35',
          isDragging && 'z-20 bg-muted/40 opacity-60 shadow-sm',
        )}
      >
        <td className={cn(workboardTdClass, 'w-8 px-1')}>
          <div className="flex items-center gap-0.5">
            {!readOnly ? (
              <WorkboardDragHandle
                listeners={listeners}
                attributes={attributes}
                label={`Arrastrar ${item.name}`}
              />
            ) : null}
            {hasKids ? (
              <button
                type="button"
                className="grid size-7 place-items-center rounded-md hover:bg-muted"
                aria-expanded={expanded}
                onClick={onToggleExpand}
              >
                {expanded ? (
                  <ChevronDown aria-hidden className="size-4" />
                ) : (
                  <ChevronRight aria-hidden className="size-4" />
                )}
              </button>
            ) : (
              <span className="size-7 shrink-0" aria-hidden />
            )}
          </div>
        </td>
        <td className={workboardTdClass}>
          <div
            className="flex min-w-0 items-center gap-1.5"
            style={{ paddingInlineStart: depth === 1 ? '1rem' : 0 }}
          >
            <WorkboardEditableCell
              value={item.name}
              readOnly={readOnly}
              className="font-medium"
              onSave={(name) => patchItem({ name })}
            />
            {hasKids ? (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {kids.length}
              </Badge>
            ) : null}
          </div>
        </td>
        <td className={workboardTdClass}>
          <WorkboardDescriptionCell
            value={item.description}
            readOnly={readOnly}
            onSave={(description) => patchItem({ description })}
          />
        </td>
        <td className={cn(workboardTdClass, 'w-[100px]')}>
          <WorkboardAssigneeCell
            assignees={item.assignees}
            readOnly={readOnly}
            onChange={(assignees) => patchItem({ assignees })}
            teamMemberNames={teamMemberNames}
          />
        </td>
        <td className={cn(workboardTdClass, 'min-w-[8.5rem]')}>
          <WorkboardStatusCell
            status={item.status}
            readOnly={readOnly}
            onChange={(status) => patchItem({ status }, { immediate: true })}
          />
        </td>
        <td className={cn(workboardTdClass, 'min-w-[5.5rem] w-[5.5rem]')}>
          <WorkboardEditableCell
            type="number"
            value={formatWorkboardHoursDisplay(item.estimatedHours)}
            display={
              item.estimatedHours > 0
                ? formatWorkboardHoursDisplay(item.estimatedHours)
                : '—'
            }
            readOnly={readOnly}
            inputClassName="tabular-nums"
            className="tabular-nums justify-center"
            onSave={(v) => patchItem({ estimatedHours: parseWorkboardHoursInput(v) })}
          />
        </td>
        <td className={cn(workboardTdClass, 'min-w-[5.5rem] w-[5.5rem]')}>
          <WorkboardEditableCell
            type="number"
            value={formatWorkboardHoursDisplay(item.actualHours)}
            display={
              item.actualHours > 0 ? formatWorkboardHoursDisplay(item.actualHours) : '—'
            }
            readOnly={readOnly}
            inputClassName="tabular-nums font-medium"
            className="tabular-nums justify-center font-medium"
            onSave={(v) => patchItem({ actualHours: parseWorkboardHoursInput(v) })}
          />
        </td>
        <td className={cn(workboardTdClass, 'w-[108px]')}>
          <WorkboardEditableCell
            type="date"
            value={item.estimatedStart}
            display={formatDisplayDate(item.estimatedStart)}
            readOnly={readOnly}
            dateMax={item.estimatedEnd?.trim() || undefined}
            onSave={(v) => saveDate('estimatedStart', v)}
          />
        </td>
        <td className={cn(workboardTdClass, 'w-[108px]')}>
          <WorkboardEditableCell
            type="date"
            value={item.estimatedEnd}
            display={formatDisplayDate(item.estimatedEnd)}
            readOnly={readOnly}
            dateMin={item.estimatedStart?.trim() || undefined}
            onSave={(v) => saveDate('estimatedEnd', v)}
          />
        </td>
        <td className={cn(workboardTdClass, 'w-[108px]')}>
          <WorkboardEditableCell
            type="date"
            value={item.actualStart}
            display={formatDisplayDate(item.actualStart)}
            readOnly={readOnly}
            dateMax={item.actualEnd?.trim() || undefined}
            onSave={(v) => saveDate('actualStart', v)}
          />
        </td>
        <td className={cn(workboardTdClass, 'w-[108px]')}>
          <WorkboardEditableCell
            type="date"
            value={item.actualEnd}
            display={formatDisplayDate(item.actualEnd)}
            readOnly={readOnly}
            dateMin={item.actualStart?.trim() || undefined}
            onSave={(v) => saveDate('actualEnd', v)}
          />
        </td>
        <td className={cn(workboardTdClass, 'min-w-[140px]')}>
          <WorkboardDescriptionCell
            value={item.comment}
            emptyLabel="Agregar comentario…"
            readOnly={readOnly}
            onSave={(comment) => patchItem({ comment })}
          />
        </td>
        <td className={cn(workboardTdClass, 'w-10 px-1')}>
          {!readOnly ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label={`Eliminar ${item.name}`}
              onClick={handleDelete}
            >
              <Trash2 aria-hidden className="size-3.5" />
            </Button>
          ) : null}
        </td>
      </tr>
      {overdue && !done ? (
        <tr className="bg-amber-50 dark:bg-amber-950/50">
          <td colSpan={WORKBOARD_COLUMN_COUNT} className="border-b border-amber-200/80 px-4 py-1.5 dark:border-amber-800">
            <p className="text-xs font-medium text-amber-950 dark:text-amber-100">
              <span className="text-destructive">Retraso:</span> {delay} día(s) respecto al fin
              estimado ({formatDisplayDate(item.estimatedEnd)})
            </p>
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}
