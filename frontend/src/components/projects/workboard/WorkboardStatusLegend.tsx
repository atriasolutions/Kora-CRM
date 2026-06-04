import {
  WORK_ITEM_STATUS_OPTIONS,
  workItemStatusBadgeClass,
} from '@/lib/project-work-status'
import { cn } from '@/lib/utils'

export function WorkboardStatusLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/10 px-4 py-2 sm:px-5"
      aria-label="Leyenda de estados"
    >
      <span className="me-1 text-[11px] font-medium text-muted-foreground">Estados:</span>
      {WORK_ITEM_STATUS_OPTIONS.map((opt) => (
        <span
          key={opt.value}
          className={cn(
            'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
            workItemStatusBadgeClass(opt.value),
          )}
        >
          {opt.label}
        </span>
      ))}
    </div>
  )
}
