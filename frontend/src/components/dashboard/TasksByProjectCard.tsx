import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectTaskDatum } from '@/types/dashboard'
import { cn } from '@/lib/utils'

type TasksByProjectCardProps = {
  items: ProjectTaskDatum[]
  className?: string
}

export function TasksByProjectCard({ items, className }: TasksByProjectCardProps) {
  return (
    <Card className={cn('h-full min-w-0 overflow-hidden border-border shadow-sm', className)}>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="text-sm font-semibold sm:text-base">Tareas por proyecto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 sm:space-y-5 sm:px-6 sm:pb-6">
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Sin proyectos activos.</p>
        ) : null}
        {items.map((proj) => (
          <Link
            key={proj.id}
            to={`/proyectos/${proj.id}`}
            className="-m-1 block space-y-1.5 rounded-lg p-1 transition-colors hover:bg-muted/50 sm:space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-medium text-foreground sm:text-sm">
                {proj.name}
              </p>
              <span className="shrink-0 text-xs font-bold tabular-nums text-primary sm:text-sm sm:text-muted-foreground">
                {proj.pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted sm:h-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-chart-2 to-chart-1 transition-all"
                style={{ width: `${proj.pct}%` }}
              />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
