import { ChevronRight, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  countSegmentMatches,
  filterOpportunities,
  getOpportunitiesBoardDataset,
  opportunitySegments,
} from '@/data/opportunities-views.mock'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { opportunityRowMatchesFilters, type OpportunityFilters } from '@/lib/opportunity-filters'
import {
  opportunityMatchesListScope,
  sortOpportunitiesByRecentlyViewed,
  type OpportunityListScope,
} from '@/lib/opportunity-list-scope'
import { opportunityStageVariant } from '@/lib/opportunity-journey'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

type OpportunitiesSegmentsViewProps = {
  query: string
  filters: OpportunityFilters
  listScope: OpportunityListScope
  recentIds: string[]
}

export function OpportunitiesSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: OpportunitiesSegmentsViewProps) {
  const navigate = useNavigate()
  const { userOpportunities, isArchived } = useOpportunitiesRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(opportunitySegments[0]!.id)

  const allOpportunities = useMemo(
    () => mergeWithDemoDataset(userOpportunities, getOpportunitiesBoardDataset()),
    [userOpportunities],
  )
  const searched = useMemo(() => {
    let result = filterOpportunities(allOpportunities, query, (o) =>
      opportunityRowMatchesFilters(o, filters),
    ).filter(
      (o) =>
        !isArchived(o.id) && opportunityMatchesListScope(o, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortOpportunitiesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allOpportunities, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => opportunitySegments.find((s) => s.id === activeSegmentId) ?? opportunitySegments[0]!,
    [activeSegmentId],
  )

  const segmentOpportunities = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentOpportunities, [
    activeSegmentId,
    query,
    listScope,
    filters,
  ])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        opportunitySegments.map((s) => [s.id, countSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="oportunidades"
        viewMode="segmentos"
      />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Segmentos guardados
        </p>
        <ul className="space-y-2">
          {opportunitySegments.map((segment) => {
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
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {count}
                  </Badge>
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
            {pagination.total} oportunidad{pagination.total === 1 ? '' : 'es'}
          </p>
        </header>

        {pagination.total === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              Ningún resultado en este segmento
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((opp) => (
              <li key={opp.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/oportunidades/${opp.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/oportunidades/${opp.id}`)
                    }
                  }}
                  className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted">
                    <Target aria-hidden className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground group-hover:text-primary">
                      {opp.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {opp.company} · {opp.amount} · {opp.weightedAmount} pond.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={opportunityStageVariant(opp.stage)}>{opp.stage}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Ver ${opp.name}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/oportunidades/${opp.id}`)
                      }}
                    >
                      <ChevronRight aria-hidden className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
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
              entityLabel="oportunidades"
            />
          </>
        )}
      </section>
    </div>
    </div>
  )
}
