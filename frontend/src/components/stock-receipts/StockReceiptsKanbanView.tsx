import { ArrowDownToLine, MoreHorizontal } from 'lucide-react'
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
import type { StockReceiptListItem, StockReceiptStatus } from '@/data/stock-receipts.mock'
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
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columns: StockReceiptStatus[] = ['Borrador', 'Confirmado']

const columnSurface: Record<StockReceiptStatus, string> = {
  Borrador: 'bg-amber-50/80 dark:bg-amber-950/20',
  Confirmado: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type StockReceiptsKanbanViewProps = {
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
    (row.supplier ?? '').toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q)
  )
}

export function StockReceiptsKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: StockReceiptsKanbanViewProps) {
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

  const byColumn = useMemo(() => {
    const map: Record<StockReceiptStatus, StockReceiptListItem[]> = {
      Borrador: [],
      Confirmado: [],
    }
    for (const row of searched) {
      map[row.status].push(row)
    }
    return map
  }, [searched])

  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columns,
    [searched.length, query, listScope, filters],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="ingresos"
        viewMode="kanban"
      />
      <div className="grid gap-4 md:grid-cols-2">
      {columns.map((col) => {
        const columnRows = byColumn[col]
        const visibleRows = sliceForColumn(col, columnRows)
        return (
        <div
          key={col}
          className={cn('rounded-xl border border-border p-3', columnSurface[col])}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{col}</h2>
            <Badge variant="secondary">{columnRows.length}</Badge>
          </div>
          <ul className={cn('space-y-2', KANBAN_COLUMN_SCROLL_CLASS)}>
            {visibleRows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => navigate(`/ingresos/${row.id}`)}
                  >
                    <p className="flex items-center gap-1.5 font-medium">
                      <ArrowDownToLine aria-hidden className="size-3.5 shrink-0 text-primary" />
                      {row.number}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.warehouse}</p>
                    <p className="text-xs text-muted-foreground">{row.productSummary}</p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal aria-hidden className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/ingresos/${row.id}`)}>
                        Ver detalle
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
            {columnRows.length === 0 ? (
              <li className="py-6 text-center text-xs text-muted-foreground">Sin ingresos</li>
            ) : null}
            <KanbanColumnMore
              hiddenCount={hiddenInColumn(col, columnRows.length)}
              onLoadMore={() => loadMoreForColumn(col)}
            />
          </ul>
        </div>
        )
      })}
    </div>
    </div>
  )
}
