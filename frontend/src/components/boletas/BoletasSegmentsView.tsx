import { ChevronRight, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import { useBoletasRegistry } from '@/hooks/use-boletas-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import {
  boletaListStatusLabel,
  boletaStatusVariant,
  withResolvedBoletaListStatus,
} from '@/lib/boleta-display'
import {
  boletaRowMatchesFilters,
  boletaSegments,
  countBoletaSegmentMatches,
  filterBoletas,
  type BoletaFilters,
} from '@/lib/boleta-filters'
import {
  boletaMatchesListScope,
  sortBoletasByRecentlyViewed,
  type BoletaListScope,
} from '@/lib/boleta-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'
import { boletaListSeed } from '@/data/boletas.mock'

type BoletasSegmentsViewProps = {
  query: string
  filters: BoletaFilters
  listScope: BoletaListScope
  recentIds: string[]
}

export function BoletasSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: BoletasSegmentsViewProps) {
  const navigate = useNavigate()
  const { userBoletas, isArchived } = useBoletasRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(boletaSegments[0]!.id)

  const allBoletas = useMemo(
    () => mergeWithDemoDataset(userBoletas, boletaListSeed),
    [userBoletas],
  )
  const searched = useMemo(() => {
    let result = filterBoletas(allBoletas, query, (bol) =>
      boletaRowMatchesFilters(bol, filters),
    ).filter(
      (bol) =>
        !isArchived(bol.id) && boletaMatchesListScope(bol, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortBoletasByRecentlyViewed(result, recentIds)
    }
    return result.map(withResolvedBoletaListStatus)
  }, [allBoletas, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => boletaSegments.find((s) => s.id === activeSegmentId) ?? boletaSegments[0]!,
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
        boletaSegments.map((s) => [s.id, countBoletaSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner total={searched.length} entityLabel="boletas" viewMode="segmentos" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-72">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segmentos
          </p>
          <ul className="space-y-1">
            {boletaSegments.map((segment) => {
              const active = segment.id === activeSegmentId
              return (
                <li key={segment.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSegmentId(segment.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border-s-4 px-3 py-2.5 text-left transition-colors',
                      segment.accentClass,
                      active ? 'bg-muted' : 'border-transparent hover:bg-muted/50',
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{segment.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {segment.description}
                      </span>
                    </span>
                    <Badge variant="secondary">{counts[segment.id] ?? 0}</Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{activeSegment.name}</h2>
            <span className="text-xs text-muted-foreground">
              {segmentItems.length} resultado{segmentItems.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {pagination.visible.map((bol) => (
              <li key={bol.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => navigate(`/boletas/${bol.id}`)}
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/30">
                    <Receipt aria-hidden className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{bol.number}</p>
                    <p className="truncate text-sm text-muted-foreground">{bol.buyerName}</p>
                  </div>
                  <div className="hidden shrink-0 text-end sm:block">
                    <p className="font-medium tabular-nums">{bol.amount}</p>
                    <p className="text-xs text-muted-foreground">{bol.issueDate}</p>
                  </div>
                  <Badge variant={boletaStatusVariant(bol.status)}>
                    {boletaListStatusLabel(bol)}
                  </Badge>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
            {pagination.visible.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hay boletas en este segmento.
              </li>
            ) : null}
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
            entityLabel="boletas"
          />
        </div>
      </div>
    </div>
  )
}
