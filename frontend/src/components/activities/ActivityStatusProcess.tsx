import { Check } from 'lucide-react'

import type { ActivityStatusHistoryEntry } from '@/data/activity-detail.mock'
import type { ActivityStatus } from '@/data/activities.mock'
import { cn } from '@/lib/utils'

const FLOW: ActivityStatus[] = ['Pendiente', 'Completada']

type ActivityStatusProcessProps = {
  currentStatus: ActivityStatus
  history: ActivityStatusHistoryEntry[]
  className?: string
}

export function ActivityStatusProcess({
  currentStatus,
  history,
  className,
}: ActivityStatusProcessProps) {
  const isOverdue = currentStatus === 'Vencida'
  const flowIdx = currentStatus === 'Completada' ? 1 : 0
  const historyByStatus = new Map(history.map((h) => [h.status, h]))

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm', className)}>
      <p className="mb-4 text-sm font-semibold text-foreground">Estado de la actividad</p>
      <ol className="grid gap-2 sm:grid-cols-2">
        {FLOW.map((status, index) => {
          const done = !isOverdue && index < flowIdx
          const active = !isOverdue && index === flowIdx
          const entry = historyByStatus.get(status)

          return (
            <li
              key={status}
              className={cn(
                'rounded-lg border px-3 py-3 text-sm',
                done &&
                  'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30',
                active && 'border-primary bg-primary/5 ring-1 ring-primary/20',
                !done && !active && 'border-border bg-muted/20',
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                    done && 'border-emerald-600 bg-emerald-600 text-white',
                    active && 'border-primary bg-primary text-primary-foreground',
                    !done && !active && 'border-border bg-background text-muted-foreground',
                  )}
                >
                  {done ? <Check aria-hidden className="size-3.5" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{status}</p>
                  {entry ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.at}</p>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {isOverdue ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
          Actividad vencida — reagendar o marcar como completada.
        </p>
      ) : null}
    </div>
  )
}
