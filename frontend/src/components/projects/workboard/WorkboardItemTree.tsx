import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'

import { WorkboardItemRow } from '@/components/projects/workboard/WorkboardItemRow'
import { WORKBOARD_COLUMN_COUNT } from '@/components/projects/workboard/workboard-table'
import { addItem, childrenOf, type WorkPlanPersistOptions } from '@/lib/project-work-plan'
import type { ProjectWorkItem, ProjectWorkPlan } from '@/types/project-work-plan'

type WorkboardItemTreeProps = {
  plan: ProjectWorkPlan
  item: ProjectWorkItem
  depth: 0 | 1
  readOnly: boolean
  onChange: (plan: ProjectWorkPlan, options?: WorkPlanPersistOptions) => void
  expandedParents: Set<string>
  onToggleParent: (id: string) => void
}

export function WorkboardItemTree({
  plan,
  item,
  depth,
  readOnly,
  onChange,
  expandedParents,
  onToggleParent,
}: WorkboardItemTreeProps) {
  const kids = childrenOf(plan, item.id)
  const hasKids = kids.length > 0
  const expanded = expandedParents.has(item.id)
  const childIds = useMemo(() => kids.map((k) => `item:${k.id}`), [kids])

  return (
    <>
      <WorkboardItemRow
        plan={plan}
        item={item}
        depth={depth}
        readOnly={readOnly}
        expanded={expanded}
        onToggleExpand={() => onToggleParent(item.id)}
        onChange={onChange}
      />
      {hasKids && expanded ? (
        <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
          {kids.map((child) => (
            <WorkboardItemTree
              key={child.id}
              plan={plan}
              item={child}
              depth={1}
              readOnly={readOnly}
              onChange={onChange}
              expandedParents={expandedParents}
              onToggleParent={onToggleParent}
            />
          ))}
        </SortableContext>
      ) : null}
      {hasKids && expanded && !readOnly ? (
        <tr>
          <td colSpan={WORKBOARD_COLUMN_COUNT} className="border-b border-border bg-muted/5 py-1.5">
            <button
              type="button"
              className="flex items-center gap-2 ps-12 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange(addItem(plan, item.groupId, item.id))}
            >
              <Plus aria-hidden className="size-3.5" />
              Agregar subactividad
            </button>
          </td>
        </tr>
      ) : null}
    </>
  )
}
