import { Boxes, ChevronRight, Loader2, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  countSegmentMatches,
  filterProducts,
  getProductsBoardDataset,
  productSegments,
} from '@/data/products-views.mock'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { productStatusVariant } from '@/lib/product-display'
import { productRowMatchesFilters, type ProductFilters } from '@/lib/product-filters'
import {
  buildSalesRankedSegmentItems,
  countSalesRankedSegment,
  formatInvoicedQuantityLabel,
  loadProductInvoiceSalesTotals,
  type ProductInvoiceSalesTotals,
  type ProductWithInvoicedQty,
} from '@/lib/product-invoice-sales'
import {
  productMatchesListScope,
  sortProductsByRecentlyViewed,
  type ProductListScope,
} from '@/lib/product-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'
import type { ProductListItem } from '@/data/products.mock'

type ProductsSegmentsViewProps = {
  query: string
  filters: ProductFilters
  listScope: ProductListScope
  recentIds: string[]
  refreshKey?: number
}

export function ProductsSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
  refreshKey = 0,
}: ProductsSegmentsViewProps) {
  const navigate = useNavigate()
  const { userProducts, isArchived } = useProductsRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(productSegments[0]!.id)
  const [salesTotals, setSalesTotals] = useState<ProductInvoiceSalesTotals | null>(null)
  const [salesTotalsLoading, setSalesTotalsLoading] = useState(true)
  const [salesTotalsError, setSalesTotalsError] = useState<string | null>(null)

  const loadSalesTotals = useCallback(async () => {
    setSalesTotalsLoading(true)
    setSalesTotalsError(null)
    try {
      const totals = await loadProductInvoiceSalesTotals()
      setSalesTotals(totals)
    } catch {
      setSalesTotals(null)
      setSalesTotalsError('No se pudieron cargar las ventas por factura.')
    } finally {
      setSalesTotalsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSalesTotals()
  }, [loadSalesTotals, refreshKey])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadSalesTotals()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadSalesTotals])

  const allProducts = useMemo(
    () => mergeWithDemoDataset(userProducts, getProductsBoardDataset()),
    [userProducts],
  )

  const salesCatalog = useMemo(
    () =>
      filterProducts(allProducts, query, (p) => productRowMatchesFilters(p, filters)).filter(
        (p) => !isArchived(p.id),
      ),
    [allProducts, query, filters, isArchived],
  )

  const searched = useMemo(() => {
    let result = salesCatalog.filter((p) =>
      productMatchesListScope(p, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortProductsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [salesCatalog, listScope, recentIds])

  const activeSegment = useMemo(
    () => productSegments.find((s) => s.id === activeSegmentId) ?? productSegments[0]!,
    [activeSegmentId],
  )

  const isSalesRankSegment = Boolean(activeSegment.salesRank)

  const segmentItems = useMemo((): ProductListItem[] | ProductWithInvoicedQty[] => {
    if (activeSegment.salesRank && salesTotals) {
      return buildSalesRankedSegmentItems(
        salesCatalog,
        salesTotals,
        activeSegment.salesRank,
      )
    }
    if (activeSegment.matches) {
      return searched.filter(activeSegment.matches)
    }
    return []
  }, [searched, salesCatalog, activeSegment, salesTotals])

  const pagination = useSegmentsPagination(segmentItems, [
    activeSegmentId,
    query,
    listScope,
    filters,
    salesTotals,
    refreshKey,
  ])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        productSegments.map((s) => {
          if (s.salesRank) {
            if (salesTotalsLoading) return [s.id, null]
            if (salesTotalsError || !salesTotals) return [s.id, null]
            return [s.id, countSalesRankedSegment(salesCatalog, salesTotals, s.salesRank)]
          }
          return [s.id, countSegmentMatches(searched, s)]
        }),
      ),
    [searched, salesCatalog, salesTotals, salesTotalsLoading, salesTotalsError],
  )

  const showSalesLoading = isSalesRankSegment && salesTotalsLoading
  const showSalesError = isSalesRankSegment && !salesTotalsLoading && salesTotalsError

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={isSalesRankSegment ? salesCatalog.length : searched.length}
        entityLabel="productos"
        viewMode="segmentos"
      />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Segmentos
        </p>
        <ul className="space-y-2">
          {productSegments.map((segment) => {
            const count = counts[segment.id]
            const isActive = segment.id === activeSegmentId
            const countLabel =
              segment.salesRank && salesTotalsLoading
                ? '…'
                : segment.salesRank && (salesTotalsError || count === null)
                  ? '—'
                  : String(count ?? 0)
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
                  <Badge variant="secondary">{countLabel}</Badge>
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
            {showSalesLoading
              ? 'Calculando…'
              : `${pagination.total} producto${pagination.total === 1 ? '' : 's'}`}
          </p>
        </header>
        {showSalesLoading ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-6 animate-spin" />
            Cargando ventas desde facturas emitidas…
          </div>
        ) : showSalesError ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-10 text-center text-sm">
            <p className="text-destructive">{salesTotalsError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadSalesTotals()}>
              <RotateCcw aria-hidden className="size-4" />
              Reintentar
            </Button>
          </div>
        ) : pagination.total === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
            {isSalesRankSegment
              ? 'Ningún producto con ventas en facturas emitidas.'
              : 'Ningún producto en este segmento.'}
          </div>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((item) => {
                const invoicedQty =
                  'invoicedQty' in item && typeof item.invoicedQty === 'number'
                    ? item.invoicedQty
                    : null
                const salesRank =
                  'salesRank' in item && typeof item.salesRank === 'number'
                    ? item.salesRank
                    : null
                return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/productos/${item.id}`)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-muted/40"
                >
                  {salesRank != null ? (
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums text-foreground">
                      #{salesRank}
                    </span>
                  ) : (
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Boxes aria-hidden className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.sku} · {item.category} · {item.price}
                    </span>
                    {invoicedQty != null ? (
                      <span className="mt-1 block text-xs font-medium text-foreground sm:hidden">
                        {formatInvoicedQuantityLabel(invoicedQty)}
                      </span>
                    ) : null}
                  </span>
                  <span className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
                    {invoicedQty != null ? (
                      <Badge variant="outline" className="tabular-nums">
                        {formatInvoicedQuantityLabel(invoicedQty)}
                      </Badge>
                    ) : null}
                    <Badge variant={productStatusVariant(item.status)}>{item.status}</Badge>
                    <Badge variant="secondary">{item.stock}</Badge>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
                )
              })}
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
              entityLabel="productos"
            />
          </>
        )}
      </section>
    </div>
    </div>
  )
}
