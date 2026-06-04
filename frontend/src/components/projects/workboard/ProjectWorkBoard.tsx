import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ProjectWorkSummary } from '@/components/projects/workboard/ProjectWorkSummary'
import { WorkboardEmptyState } from '@/components/projects/workboard/WorkboardEmptyState'
import { WorkboardGroupSection } from '@/components/projects/workboard/WorkboardGroupSection'
import { ProjectWorkGantt } from '@/components/projects/workboard/ProjectWorkGantt'
import { ProjectWorkHoursByPerson } from '@/components/projects/workboard/ProjectWorkHoursByPerson'
import {
  WorkboardPlanHeader,
  type WorkboardPlanView,
} from '@/components/projects/workboard/WorkboardPlanHeader'
import { WorkboardStatusLegend } from '@/components/projects/workboard/WorkboardStatusLegend'
import { WorkboardTableShell } from '@/components/projects/workboard/WorkboardTableShell'
import { Card } from '@/components/ui/card'
import {
  addGroup,
  moveWorkItemOverItem,
  moveWorkItemToGroup,
  reorderGroups,
} from '@/lib/project-work-plan'
import type { WorkPlanPersistOptions } from '@/lib/project-work-plan'
import type { ProjectWorkPlan } from '@/types/project-work-plan'
import type { ProjectWorkMetrics } from '@/types/project-work-plan'

type ProjectWorkBoardProps = {
  plan: ProjectWorkPlan
  metrics: ProjectWorkMetrics
  onChange: (plan: ProjectWorkPlan, options?: WorkPlanPersistOptions) => void
  readOnly?: boolean
  projectTitle?: string
}

function parseDragId(id: string) {
  const [kind, ...rest] = id.split(':')
  return { kind, entityId: rest.join(':') }
}

export function ProjectWorkBoard({
  plan,
  metrics,
  onChange,
  readOnly = false,
  projectTitle,
}: ProjectWorkBoardProps) {
  const [planView, setPlanView] = useState<WorkboardPlanView>('table')
  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set())
  const [newGroupName, setNewGroupName] = useState('')
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null)

  useEffect(() => {
    const withKids = plan.items.filter((i) =>
      plan.items.some((c) => c.parentId === i.id),
    )
    if (withKids.length === 0) return
    setExpandedParents((prev) => {
      if (prev.size > 0) return prev
      return new Set(withKids.map((i) => i.id))
    })
  }, [plan.items])

  const sortedGroups = useMemo(
    () => [...plan.groups].sort((a, b) => a.order - b.order),
    [plan.groups],
  )

  const groupSortableIds = useMemo(
    () => sortedGroups.map((g) => `group:${g.id}`),
    [sortedGroups],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const toggleParent = useCallback((id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleAddGroup = useCallback(
    (name?: string) => {
      const label = (name ?? newGroupName).trim()
      if (!label) return
      onChange(addGroup(plan, label))
      setNewGroupName('')
    },
    [newGroupName, onChange, plan],
  )

  const handleDragStart = useCallback(
    (event: { active: { id: string | number } }) => {
      const { kind, entityId } = parseDragId(String(event.active.id))
      if (kind === 'group') {
        const g = plan.groups.find((x) => x.id === entityId)
        setActiveDragLabel(g?.name ?? 'Grupo')
        return
      }
      if (kind === 'item') {
        const item = plan.items.find((x) => x.id === entityId)
        setActiveDragLabel(item?.name ?? 'Actividad')
      }
    },
    [plan.groups, plan.items],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragLabel(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeParsed = parseDragId(String(active.id))
      const overParsed = parseDragId(String(over.id))

      if (activeParsed.kind === 'group' && overParsed.kind === 'group') {
        onChange(reorderGroups(plan, activeParsed.entityId, overParsed.entityId))
        return
      }

      if (activeParsed.kind === 'item') {
        if (overParsed.kind === 'group') {
          onChange(moveWorkItemToGroup(plan, activeParsed.entityId, overParsed.entityId))
          return
        }
        if (overParsed.kind === 'item') {
          onChange(moveWorkItemOverItem(plan, activeParsed.entityId, overParsed.entityId))
        }
      }
    },
    [onChange, plan],
  )

  const handleDragCancel = useCallback(() => setActiveDragLabel(null), [])

  const tableBody = sortedGroups.map((group) => (
    <WorkboardGroupSection
      key={group.id}
      group={group}
      plan={plan}
      readOnly={readOnly}
      onChange={onChange}
      expandedParents={expandedParents}
      onToggleParent={toggleParent}
    />
  ))

  const hasGroups = sortedGroups.length > 0

  const tableContent = hasGroups ? (
    readOnly ? (
      <WorkboardTableShell>{tableBody}</WorkboardTableShell>
    ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <WorkboardTableShell>
          <SortableContext items={groupSortableIds} strategy={verticalListSortingStrategy}>
            {tableBody}
          </SortableContext>
        </WorkboardTableShell>
        <DragOverlay>
          {activeDragLabel ? (
            <div className="rounded-md border border-primary/30 bg-card px-3 py-2 text-sm font-medium shadow-lg ring-2 ring-primary/20">
              {activeDragLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    )
  ) : (
    <WorkboardEmptyState
      readOnly={readOnly}
      onAddGroup={() => handleAddGroup('Nuevo grupo')}
    />
  )

  return (
    <div className="space-y-4">
      <ProjectWorkSummary metrics={metrics} />

      <Card className="overflow-hidden shadow-sm">
        <WorkboardPlanHeader
          readOnly={readOnly}
          view={planView}
          onViewChange={setPlanView}
          newGroupName={newGroupName}
          onNewGroupNameChange={setNewGroupName}
          onAddGroup={() => handleAddGroup()}
          groupCount={sortedGroups.length}
          itemCount={plan.items.length}
        />

        {planView === 'table' && hasGroups ? <WorkboardStatusLegend /> : null}

        {planView === 'hours' ? (
          <ProjectWorkHoursByPerson plan={plan} />
        ) : planView === 'gantt' ? (
          <ProjectWorkGantt plan={plan} projectTitle={projectTitle} />
        ) : hasGroups ? (
          <div className="overflow-x-auto">
            <div className="min-w-0">{tableContent}</div>
          </div>
        ) : (
          tableContent
        )}
      </Card>
    </div>
  )
}
