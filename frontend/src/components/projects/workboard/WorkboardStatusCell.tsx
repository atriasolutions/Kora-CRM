import { Badge } from '@/components/ui/badge'
import {
  WORK_ITEM_STATUS_OPTIONS,
  workItemStatusBadgeClass,
  workItemStatusLabel,
  workItemStatusSelectClass,
  type ProjectWorkItemStatus,
} from '@/lib/project-work-status'
import { cn } from '@/lib/utils'

type WorkboardStatusCellProps = {
  status: ProjectWorkItemStatus
  readOnly?: boolean
  onChange: (status: ProjectWorkItemStatus) => void
}

const selectClass =
  'h-8 w-full min-w-[7.75rem] max-w-[9.5rem] rounded-md border border-input bg-background px-2 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function WorkboardStatusCell({
  status,
  readOnly = false,
  onChange,
}: WorkboardStatusCellProps) {
  if (readOnly) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'max-w-full truncate font-normal',
          workItemStatusBadgeClass(status),
        )}
      >
        {workItemStatusLabel(status)}
      </Badge>
    )
  }

  return (
    <select
      className={cn(selectClass, workItemStatusSelectClass(status))}
      value={status}
      aria-label="Estado de la actividad"
      onChange={(e) => onChange(e.target.value as ProjectWorkItemStatus)}
    >
      {WORK_ITEM_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
