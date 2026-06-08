import { ChevronRight, ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import {
  countSegmentMatches,
  filterSolicitudes,
  getSolicitudesBoardDataset,
  solicitudSegments,
} from '@/data/solicitudes-views.mock'
import { useSolicitudesRegistry } from '@/hooks/use-solicitudes-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import {
  solicitudMatchesListScope,
  sortSolicitudesByRecentlyViewed,
  type SolicitudListScope,
} from '@/lib/solicitud-list-scope'
import { solicitudRowMatchesFilters, type SolicitudFilters } from '@/lib/solicitud-filters'
import {
  solicitudPriorityVariant,
  solicitudStatusVariant,
} from '@/lib/solicitud-display'
import { cn } from '@/lib/utils'

type SolicitudesSegmentsViewProps = {
  query: string
  listScope: SolicitudListScope
  recentIds: string[]
  filters: SolicitudFilters
}

export function SolicitudesSegmentsView({
  query,
  listScope,
  recentIds,
  filters,
}: SolicitudesSegmentsViewProps) {
  const navigate = useNavigate()
  const { userSolicitudes, isArchived } = useSolicitudesRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(solicitudSegments[0]!.id)

  const allSolicitudes = useMemo(
    () => mergeWithDemoDataset(userSolicitudes, getSolicitudesBoardDataset()),
    [userSolicitudes],
  )

  const searched = useMemo(() => {
    let result = filterSolicitudes(allSolicitudes, query).filter(
      (item) =>
        solicitudRowMatchesFilters(item, filters) &&
        !isArchived(item.id) &&
        solicitudMatchesListScope(item, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortSolicitudesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allSolicitudes, query, isArchived, listScope, recentIds, filters])

  const activeSegment = useMemo(
    () => solicitudSegments.find((segment) => segment.id === activeSegmentId) ?? solicitudSegments[0]!,
    [activeSegmentId],
  )

  const segmentItems = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentItems, [activeSegmentId, query, listScope])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        solicitudSegments.map((segment) => [segment.id, countSegmentMatches(searched, segment)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="solicitudes"
        viewMode="segmentos"
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-72">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segmentos
          </p>
          <ul className="space-y-2">
            {solicitudSegments.map((segment) => {
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
              {pagination.total} solicitud{pagination.total === 1 ? '' : 'es'}
            </p>
          </header>
          {pagination.total === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              Ninguna solicitud en este segmento.
            </div>
          ) : (
            <>
              <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
                {pagination.visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/solicitudes/${item.id}`)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-muted/40"
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ClipboardList aria-hidden className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground">{item.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.code} · {item.assignee || 'Sin responsable'}
                        </span>
                      </span>
                      <span className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
                        <Badge variant={solicitudStatusVariant(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge variant={solicitudPriorityVariant(item.priority)}>
                          {item.priority}
                        </Badge>
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
                entityLabel="solicitudes"
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
