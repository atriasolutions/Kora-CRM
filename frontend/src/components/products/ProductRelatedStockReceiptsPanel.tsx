import { ArrowDownToLine, ChevronRight } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductDetail } from '@/data/product-detail.mock'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import { stockReceiptsForProduct } from '@/lib/product-relations'

type ProductRelatedStockReceiptsPanelProps = {
  product: ProductDetail
  onCountChange?: (count: number) => void
}

function searchReceipt(row: StockReceiptListItem, q: string): boolean {
  return (
    row.number.toLowerCase().includes(q) ||
    row.status.toLowerCase().includes(q) ||
    row.productSummary.toLowerCase().includes(q) ||
    (row.confirmedAt ?? '').toLowerCase().includes(q)
  )
}

export function ProductRelatedStockReceiptsPanel({
  product,
  onCountChange,
}: ProductRelatedStockReceiptsPanelProps) {
  const related = useMemo(() => stockReceiptsForProduct(product), [product])

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ArrowDownToLine aria-hidden className="size-4 text-primary" />
          Ingresos de stock
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/ingresos">Ver módulo ingresos</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <RelatedEntityList
          items={related}
          searchPlaceholder="Buscar ingresos…"
          searchFilter={(row, q) => searchReceipt(row, q)}
          emptyMessage={`No hay ingresos de stock vinculados a ${product.name}.`}
          renderItem={(r) => (
            <li key={r.id}>
              <Link
                to={`/ingresos/${r.id}`}
                className="group flex flex-col gap-2 rounded-md border border-border px-3 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary">
                    {r.number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.confirmedAt ?? '—'} · {r.productSummary}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Badge variant={r.status === 'Confirmado' ? 'default' : 'secondary'}>
                    {r.status}
                  </Badge>
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </Link>
            </li>
          )}
        />
      </CardContent>
    </Card>
  )
}
