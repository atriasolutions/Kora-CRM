import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  activitySegments,
  countSegmentMatches,
  filterActivities,
  getActivitiesBoardDataset,
} from '@/data/activities-views.mock'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import {
  activityPriorityVariant,
  activityStatusVariant,
} from '@/lib/activity-display'
import { activityTypeColors, activityTypeIcons } from '@/lib/activity-icons'
import { activityRowMatchesFilters, type ActivityFilters } from '@/lib/activity-filters'
import {
  activityMatchesListScope,
  sortActivitiesByRecentlyViewed,
  type ActivityListScope,
} from '@/lib/activity-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

type ActivitiesSegmentsViewProps = {
  query: string
  filters: ActivityFilters
  listScope: ActivityListScope
  recentIds: string[]
}

export function ActivitiesSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: ActivitiesSegmentsViewProps) {
  const navigate = useNavigate()
  const { userActivities, isArchived } = useActivitiesRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(activitySegments[0]!.id)

  const allActivities = useMemo(
    () => mergeWithDemoDataset(userActivities, getActivitiesBoardDataset()),
    [userActivities],
  )
  const searched = useMemo(() => {
    let result = filterActivities(allActivities, query, (a) =>
      activityRowMatchesFilters(a, filters),
    ).filter(
      (a) =>
        !isArchived(a.id) && activityMatchesListScope(a, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortActivitiesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allActivities, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => activitySegments.find((s) => s.id === activeSegmentId) ?? activitySegments[0]!,
    [activeSegmentId],
  )

  const segmentItems = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentItems, [
    activeSegmentId,
    query,
    listScope,
    filters,
  ])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        activitySegments.map((s) => [s.id, countSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="actividades"
        viewMode="segmentos"
      />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Segmentos
        </p>
        <ul className="space-y-2">
          {activitySegments.map((segment) => {
            const count = counts[segment.id] ?? 0
            const isActive = segment.id === activeSegmentId
            return (
              <li key={segment.id}>
                <button
                  type="button"
                  onClick={() => setActiveSegmentId(segment.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-start shadow-sm transition-colors',
                    'border-s-4',
                    segment.accentClass,
                    isActive && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{segment.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {segment.description}
                    </p>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="min-w-0 flex-1 rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{activeSegment.name}</h2>
            <p className="text-sm text-muted-foreground">{activeSegment.description}</p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {pagination.total} actividad{pagination.total === 1 ? '' : 'es'}
          </p>
        </header>
        {pagination.total === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
            Ninguna actividad en este segmento con los filtros actuales.
          </div>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((item) => {
              const Icon = activityTypeIcons[item.type]
              const colors = activityTypeColors[item.type]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/actividades/${item.id}`)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-lg',
                        colors.bg,
                      )}
                    >
                      <Icon aria-hidden className={cn('size-4', colors.color)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {item.relatedName} · {item.due}
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
                      <Badge variant={activityStatusVariant(item.status)}>{item.status}</Badge>
                      <Badge variant={activityPriorityVariant(item.priority)}>
                        {item.priority}
                      </Badge>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  </button>
                </li>
              )
            })}
            </ul>
            <SegmentsListPagination
              total={pagination.total}
              rangeFrom={pagination.rangeFrom}
              rangeTo={pagination.rangeTo}
              page={pagination.page}
              totalPages={pagination.totalPages}
              canPrev={pagination.canPrev}
              canNext={pagination.canNext}
              onPrev={() => pagination.setPage((p) => p - 1)}
              onNext={() => pagination.setPage((p) => p + 1)}
              entityLabel="actividades"
            />
          </>
        )}
        <Button variant="link" className="mt-4 px-4" asChild>
          <a href="/actividades">Ver todas en lista</a>
        </Button>
      </section>
    </div>
    </div>
  )
}
