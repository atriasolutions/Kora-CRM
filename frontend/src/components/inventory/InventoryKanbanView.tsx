import { MoreHorizontal, Warehouse } from 'lucide-react'
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
  filterInventory,
  getInventoryBoardDataset,
  INVENTORY_KANBAN_COLUMNS,
} from '@/data/inventory-views.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import { inventoryProductDetailPath } from '@/lib/inventory-aggregate'
import { inventoryRowMatchesFilters, type InventoryFilters } from '@/lib/inventory-filters'
import {
  inventoryKanbanColumn,
  type InventoryKanbanColumn,
} from '@/lib/inventory-status'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<InventoryKanbanColumn, string> = {
  'En stock': 'bg-emerald-50/80 dark:bg-emerald-950/20',
  'Stock bajo': 'bg-amber-50/80 dark:bg-amber-950/20',
  'Quiebre de stock': 'bg-orange-50/80 dark:bg-orange-950/20',
  Reservado: 'bg-violet-50/80 dark:bg-violet-950/20',
  'Sin stock': 'bg-rose-50/80 dark:bg-rose-950/20',
}

type InventoryKanbanViewProps = {
  query: string
  filters: InventoryFilters
  items?: InventoryListItem[]
}

export function InventoryKanbanView({
  query,
  filters,
  items: itemsProp,
}: InventoryKanbanViewProps) {
  const navigate = useNavigate()

  const items = useMemo(() => {
    const source = itemsProp ?? mergeWithDemoDataset([], getInventoryBoardDataset())
    return filterInventory(source, query, (row) =>
      inventoryRowMatchesFilters(row, filters),
    )
  }, [itemsProp, query, filters])

  const byStatus = useMemo(() => {
    const map: Record<InventoryKanbanColumn, InventoryListItem[]> = {
      'En stock': [],
      'Stock bajo': [],
      'Quiebre de stock': [],
      Reservado: [],
      'Sin stock': [],
    }
    items.forEach((row) => {
      const col = inventoryKanbanColumn(row.status)
      map[col].push(row)
    })
    return map
  }, [items])

  const columnKeys = useMemo(() => INVENTORY_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [items.length, query, filters],
  )

  if (items.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay registros con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={items.length}
        entityLabel="registros"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {INVENTORY_KANBAN_COLUMNS.map(({ status, description }) => {
        const columnItems = byStatus[status]
        const visibleItems = sliceForColumn(status, columnItems)
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
                <Badge variant="secondary">{columnItems.length}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </header>
            <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(inventoryProductDetailPath(item.sku))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(inventoryProductDetailPath(item.sku))
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Warehouse aria-hidden className="size-4" />
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
                            onSelect={() => navigate(inventoryProductDetailPath(item.sku))}
                          >
                            Ver detalle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.sku}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.location}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={inventoryStatusVariant(item.status)}>{item.status}</Badge>
                      <Badge variant="secondary">{item.quantity}</Badge>
                    </div>
                  </article>
                </li>
              ))}
              <KanbanColumnMore
                hiddenCount={hiddenInColumn(status, columnItems.length)}
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
