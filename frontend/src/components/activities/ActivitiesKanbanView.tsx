import { MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { KanbanColumnMore } from '@/components/list/KanbanColumnMore'
import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ACTIVITY_KANBAN_COLUMNS,
  filterActivities,
  getActivitiesBoardDataset,
} from '@/data/activities-views.mock'
import type { ActivityListItem, ActivityStatus } from '@/data/activities.mock'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { activityPriorityVariant } from '@/lib/activity-display'
import { activityTypeColors, activityTypeIcons } from '@/lib/activity-icons'
import { activityRowMatchesFilters, type ActivityFilters } from '@/lib/activity-filters'
import {
  activityMatchesListScope,
  sortActivitiesByRecentlyViewed,
  type ActivityListScope,
} from '@/lib/activity-list-scope'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<ActivityStatus, string> = {
  Pendiente: 'bg-sky-50/80 dark:bg-sky-950/20',
  'En curso': 'bg-violet-50/80 dark:bg-violet-950/20',
  Vencida: 'bg-rose-50/80 dark:bg-rose-950/20',
  Completada: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type ActivitiesKanbanViewProps = {
  query: string
  filters: ActivityFilters
  listScope: ActivityListScope
  recentIds: string[]
}

export function ActivitiesKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: ActivitiesKanbanViewProps) {
  const navigate = useNavigate()
  const { userActivities, isArchived } = useActivitiesRegistry()

  const activities = useMemo(() => {
    const all = mergeWithDemoDataset(userActivities, getActivitiesBoardDataset())
    let result = filterActivities(all, query, (a) =>
      activityRowMatchesFilters(a, filters),
    ).filter(
      (a) =>
        !isArchived(a.id) && activityMatchesListScope(a, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortActivitiesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [query, filters, userActivities, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<ActivityStatus, ActivityListItem[]> = {
      Pendiente: [],
      'En curso': [],
      Vencida: [],
      Completada: [],
    }
    activities.forEach((a) => map[a.status].push(a))
    return map
  }, [activities])

  const columnKeys = useMemo(() => ACTIVITY_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [activities.length, query, listScope, filters],
  )

  if (activities.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay actividades con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={activities.length}
        entityLabel="actividades"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-3">
      {ACTIVITY_KANBAN_COLUMNS.map(({ status, description }) => {
        const items = byStatus[status]
        const visibleItems = sliceForColumn(status, items)
        return (
          <section
            key={status}
            className={cn('flex min-h-[320px] flex-col rounded-xl border border-border', columnSurface[status])}
          >
            <header className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">{status}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </header>
            <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
              {visibleItems.map((item) => {
                const Icon = activityTypeIcons[item.type]
                const colors = activityTypeColors[item.type]
                return (
                  <li key={item.id}>
                    <article
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/actividades/${item.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/actividades/${item.id}`)
                      }}
                      className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                            colors.bg,
                          )}
                        >
                          <Icon aria-hidden className={cn('size-4', colors.color)} />
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal aria-hidden className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Completar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.relatedName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={activityPriorityVariant(item.priority)}>
                          {item.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.due}</span>
                      </div>
                    </article>
                  </li>
                )
              })}
              <KanbanColumnMore
                hiddenCount={hiddenInColumn(status, items.length)}
                onLoadMore={() => loadMoreForColumn(status)}
              />
            </ul>
          </section>
        )
      })}
    </div>
    </div>
  )
}
