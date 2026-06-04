import { Boxes, MoreHorizontal } from 'lucide-react'
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
  filterProducts,
  getProductsBoardDataset,
  PRODUCT_KANBAN_COLUMNS,
} from '@/data/products-views.mock'
import type { ProductListItem, ProductStatus } from '@/data/products.mock'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { productStatusVariant } from '@/lib/product-display'
import { productRowMatchesFilters, type ProductFilters } from '@/lib/product-filters'
import {
  productMatchesListScope,
  sortProductsByRecentlyViewed,
  type ProductListScope,
} from '@/lib/product-list-scope'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<ProductStatus, string> = {
  Activo: 'bg-emerald-50/80 dark:bg-emerald-950/20',
  Agotado: 'bg-rose-50/80 dark:bg-rose-950/20',
  Borrador: 'bg-muted/60',
}

type ProductsKanbanViewProps = {
  query: string
  filters: ProductFilters
  listScope: ProductListScope
  recentIds: string[]
}

export function ProductsKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: ProductsKanbanViewProps) {
  const navigate = useNavigate()
  const { userProducts, isArchived } = useProductsRegistry()

  const products = useMemo(() => {
    const all = mergeWithDemoDataset(userProducts, getProductsBoardDataset())
    let result = filterProducts(all, query, (p) =>
      productRowMatchesFilters(p, filters),
    ).filter(
      (p) =>
        !isArchived(p.id) && productMatchesListScope(p, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortProductsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [query, filters, userProducts, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<ProductStatus, ProductListItem[]> = {
      Activo: [],
      Agotado: [],
      Borrador: [],
    }
    products.forEach((p) => map[p.status].push(p))
    return map
  }, [products])

  const columnKeys = useMemo(() => PRODUCT_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [products.length, query, listScope, filters],
  )

  if (products.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay productos con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={products.length}
        entityLabel="productos"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-3">
      {PRODUCT_KANBAN_COLUMNS.map(({ status, description }) => {
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
                    onClick={() => navigate(`/productos/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/productos/${item.id}`)
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Boxes aria-hidden className="size-4" />
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
                          <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.sku}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      <span>{item.category}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">{item.price}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={productStatusVariant(item.status)}>{item.status}</Badge>
                      {item.stockNum >= 0 ? (
                        <Badge variant="secondary">Stock: {item.stock}</Badge>
                      ) : null}
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
