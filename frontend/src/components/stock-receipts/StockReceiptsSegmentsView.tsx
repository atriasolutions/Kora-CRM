import { ArrowDownToLine, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import { useStockReceiptsRegistry } from '@/hooks/use-stock-receipts-registry'
import {
  stockReceiptRowMatchesFilters,
  type StockReceiptFilters,
} from '@/lib/stock-receipt-filters'
import {
  stockReceiptMatchesListScope,
  sortStockReceiptsByRecentlyViewed,
  type StockReceiptListScope,
} from '@/lib/stock-receipt-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

type Segment = {
  id: string
  label: string
  matches: (row: StockReceiptListItem) => boolean
}

type StockReceiptsSegmentsViewProps = {
  query: string
  filters: StockReceiptFilters
  listScope: StockReceiptListScope
  recentIds: string[]
}

function matchesSearch(row: StockReceiptListItem, q: string): boolean {
  if (!q) return true
  return (
    row.number.toLowerCase().includes(q) ||
    row.externalReference.toLowerCase().includes(q) ||
    row.warehouse.toLowerCase().includes(q) ||
    (row.supplier ?? '').toLowerCase().includes(q)
  )
}

function buildSegments(rows: StockReceiptListItem[]): Segment[] {
  const warehouses = [...new Set(rows.map((r) => r.warehouse).filter(Boolean))].sort()
  return [
    { id: 'all', label: 'Todos', matches: () => true },
    ...warehouses.map((w) => ({
      id: `wh-${w}`,
      label: w,
      matches: (row: StockReceiptListItem) => row.warehouse === w,
    })),
    {
      id: 'from-oc',
      label: 'Desde OC',
      matches: (row) => Boolean(row.purchaseId),
    },
    {
      id: 'external',
      label: 'Referencia externa',
      matches: (row) => !row.purchaseId,
    },
  ]
}

export function StockReceiptsSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: StockReceiptsSegmentsViewProps) {
  const navigate = useNavigate()
  const { allReceipts, isArchived } = useStockReceiptsRegistry()
  const q = query.trim().toLowerCase()

  const searched = useMemo(() => {
    let result = allReceipts.filter(
      (r) =>
        !isArchived(r.id) &&
        stockReceiptRowMatchesFilters(r, filters) &&
        matchesSearch(r, q) &&
        stockReceiptMatchesListScope(r, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortStockReceiptsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allReceipts, filters, isArchived, listScope, q, recentIds])

  const segments = useMemo(() => buildSegments(searched), [searched])
  const [activeSegmentId, setActiveSegmentId] = useState('all')

  const activeSegment = useMemo(
    () => segments.find((s) => s.id === activeSegmentId) ?? segments[0]!,
    [activeSegmentId, segments],
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

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="ingresos"
        viewMode="segmentos"
      />
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <nav className="space-y-1 rounded-xl border border-border bg-card p-2 shadow-sm">
        {segments.map((seg) => {
          const count = searched.filter(seg.matches).length
          return (
            <button
              key={seg.id}
              type="button"
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                activeSegmentId === seg.id
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              onClick={() => setActiveSegmentId(seg.id)}
            >
              <span className="truncate">{seg.label}</span>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {count}
              </Badge>
            </button>
          )
        })}
      </nav>
      <section className="rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{activeSegment.label}</h2>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {pagination.total} ingreso{pagination.total === 1 ? '' : 's'}
          </p>
        </header>
        {pagination.total === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            No hay ingresos en este segmento.
          </p>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                    onClick={() => navigate(`/ingresos/${row.id}`)}
                  >
                    <ArrowDownToLine aria-hidden className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{row.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.warehouse} · {row.status} · {row.owner}
                      </p>
                    </div>
                    <Badge variant={row.status === 'Confirmado' ? 'default' : 'secondary'}>
                      {row.status}
                    </Badge>
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
              entityLabel="ingresos"
            />
          </>
        )}
      </section>
    </div>
    </div>
  )
}
