import { MoreHorizontal, ShoppingCart } from 'lucide-react'
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
  filterPurchases,
  PURCHASE_KANBAN_COLUMNS,
} from '@/data/purchases-views.mock'
import type { PurchaseListItem, PurchaseStatus } from '@/data/purchases.mock'
import { usePurchasesRegistry } from '@/hooks/use-purchases-registry'
import { purchaseStatusVariant } from '@/lib/purchase-display'
import { purchaseRowMatchesFilters, type PurchaseFilters } from '@/lib/purchase-filters'
import {
  purchaseMatchesListScope,
  sortPurchasesByRecentlyViewed,
  type PurchaseListScope,
} from '@/lib/purchase-list-scope'
import {
  legacyStatusToPurchaseJourney,
  purchaseKanbanColumn,
} from '@/lib/purchase-journey'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

type KanbanColumn = PurchaseStatus

const columnSurface: Record<KanbanColumn, string> = {
  Borrador: 'bg-muted/60',
  Emitida: 'bg-amber-50/80 dark:bg-amber-950/20',
  Confirmada: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type PurchasesKanbanViewProps = {
  query: string
  filters: PurchaseFilters
  listScope: PurchaseListScope
  recentIds: string[]
}

export function PurchasesKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: PurchasesKanbanViewProps) {
  const navigate = useNavigate()
  const { allPurchases, isArchived } = usePurchasesRegistry()

  const purchases = useMemo(() => {
    let result = filterPurchases(allPurchases, query, (p) =>
      purchaseRowMatchesFilters(p, filters),
    ).filter(
      (p) =>
        !isArchived(p.id) && purchaseMatchesListScope(p, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortPurchasesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allPurchases, query, filters, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<KanbanColumn, PurchaseListItem[]> = {
      Borrador: [],
      Emitida: [],
      Confirmada: [],
    }
    purchases.forEach((p) => {
      const col = purchaseKanbanColumn(legacyStatusToPurchaseJourney(p.status))
      map[col].push(p)
    })
    return map
  }, [purchases])

  const columnKeys = useMemo(() => PURCHASE_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [purchases.length, query, listScope, filters],
  )

  if (purchases.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay compras con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={purchases.length}
        entityLabel="compras"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {PURCHASE_KANBAN_COLUMNS.map(({ status, description }) => {
        const items = byStatus[status]
        const visibleItems = sliceForColumn(status, items)
        return (
          <section
            key={status}
            className={cn(
              'flex min-h-[320px] flex-col rounded-xl border border-border',
              columnSurface[status],
            )}
          >
            <header className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">{status}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </header>
            <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/compras/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/compras/${item.id}`)
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShoppingCart aria-hidden className="size-4" />
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
                          <DropdownMenuItem
                            onSelect={() => navigate(`/compras/${item.id}`)}
                          >
                            Ver detalle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                      {item.reference}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.supplier}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {item.productSummary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={purchaseStatusVariant(item.status)}>{item.status}</Badge>
                      <span className="text-xs font-medium text-foreground">{item.amount}</span>
                    </div>
                  </article>
                </li>
              ))}
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
