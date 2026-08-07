import { ChevronRight, ClipboardCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'
import { usePruebasSolicitudRegistry } from '@/hooks/use-pruebas-solicitud-registry'
import { formatChileDateLabel } from '@/lib/chile-timezone'
import { formatPruebaClientProgress } from '@/lib/prueba-solicitud-form'
import {
  pruebaSolicitudRowMatchesFilters,
  type PruebaSolicitudFilters,
} from '@/lib/prueba-solicitud-filters'
import {
  countPruebaSegmentMatches,
  filterPruebasSolicitud,
  pruebaSolicitudSegments,
} from '@/lib/pruebas-solicitud-views'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

type PruebasSolicitudSegmentsViewProps = {
  query: string
  filters: PruebaSolicitudFilters
}

export function PruebasSolicitudSegmentsView({
  query,
  filters,
}: PruebasSolicitudSegmentsViewProps) {
  const navigate = useNavigate()
  const { allPruebas, isArchived } = usePruebasSolicitudRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(pruebaSolicitudSegments[0]!.id)

  const searched = useMemo(
    () =>
      filterPruebasSolicitud(allPruebas, query).filter(
        (item) =>
          pruebaSolicitudRowMatchesFilters(item, filters) && !isArchived(item.id),
      ),
    [allPruebas, query, filters, isArchived],
  )

  const activeSegment = useMemo(
    () =>
      pruebaSolicitudSegments.find((segment) => segment.id === activeSegmentId) ??
      pruebaSolicitudSegments[0]!,
    [activeSegmentId],
  )

  const segmentItems = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentItems, [activeSegmentId, query, filters])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        pruebaSolicitudSegments.map((segment) => [
          segment.id,
          countPruebaSegmentMatches(searched, segment),
        ]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner total={searched.length} entityLabel="pruebas" viewMode="segmentos" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-72">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segmentos
          </p>
          <ul className="space-y-2">
            {pruebaSolicitudSegments.map((segment) => {
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
              {pagination.total} prueba{pagination.total === 1 ? '' : 's'}
            </p>
          </header>
          {pagination.total === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Ninguna prueba en este segmento.
            </div>
          ) : (
            <>
              <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
                {pagination.visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/pruebas-solicitud/${item.id}`)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-muted/40"
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ClipboardCheck aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground">{item.code}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.solicitudCode} · {item.solicitudTitle}
                        </span>
                      </span>
                      <span className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground sm:flex">
                        <span>{formatPruebaClientProgress(item.clientOkCount, item.caseCount)}</span>
                        <span>
                          {item.executedAt ? formatChileDateLabel(item.executedAt) : 'Sin fecha'}
                        </span>
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
                onPrev={() => pagination.setPage((page) => page - 1)}
                onNext={() => pagination.setPage((page) => page + 1)}
                entityLabel="pruebas"
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
