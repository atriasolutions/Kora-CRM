import { ChevronRight, FileSpreadsheet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import {
  countQuoteSegmentMatches,
  filterQuotes,
  getQuotesBoardDataset,
  quoteSegments,
} from '@/data/quotes-views.mock'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { quoteStatusVariant } from '@/lib/quote-display'
import { quoteRowMatchesFilters, type QuoteFilters } from '@/lib/quote-filters'
import {
  quoteMatchesListScope,
  sortQuotesByRecentlyViewed,
  type QuoteListScope,
} from '@/lib/quote-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

type QuotesSegmentsViewProps = {
  query: string
  filters: QuoteFilters
  listScope: QuoteListScope
  recentIds: string[]
}

export function QuotesSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: QuotesSegmentsViewProps) {
  const navigate = useNavigate()
  const { userQuotes, isArchived } = useQuotesRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(quoteSegments[0]!.id)

  const allQuotes = useMemo(
    () => mergeWithDemoDataset(userQuotes, getQuotesBoardDataset()),
    [userQuotes],
  )
  const searched = useMemo(() => {
    let result = filterQuotes(allQuotes, query, (quote) =>
      quoteRowMatchesFilters(quote, filters),
    ).filter(
      (quote) =>
        !isArchived(quote.id) && quoteMatchesListScope(quote, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortQuotesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allQuotes, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => quoteSegments.find((s) => s.id === activeSegmentId) ?? quoteSegments[0]!,
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
        quoteSegments.map((s) => [s.id, countQuoteSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="cotizaciones"
        viewMode="segmentos"
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-72">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segmentos
          </p>
          <ul className="space-y-2">
            {quoteSegments.map((segment) => {
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
              {pagination.total} cotización{pagination.total === 1 ? '' : 'es'}
            </p>
          </header>
          {pagination.total === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Ninguna cotización en este segmento.
            </div>
          ) : (
            <>
              <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
                {pagination.visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/cotizaciones/${item.id}`)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-muted/40"
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileSpreadsheet aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono font-medium text-foreground">
                          {item.code}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.title} · {item.companyName}
                        </span>
                        <span className="mt-1 block text-sm font-semibold tabular-nums">
                          {item.amount}
                        </span>
                      </span>
                      <span className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
                        <Badge variant={quoteStatusVariant(item.status)}>{item.status}</Badge>
                      </span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    </button>
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
                entityLabel="cotizaciones"
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
