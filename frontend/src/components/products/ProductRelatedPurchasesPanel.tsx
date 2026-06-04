import { ChevronRight, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductDetail } from '@/data/product-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { purchaseStatusVariant } from '@/lib/purchase-display'
import { purchasesForProduct } from '@/lib/product-relations'

type ProductRelatedPurchasesPanelProps = {
  product: ProductDetail
  onCountChange?: (count: number) => void
}

function searchPurchase(pur: PurchaseListItem, q: string): boolean {
  return (
    pur.reference.toLowerCase().includes(q) ||
    pur.supplier.toLowerCase().includes(q) ||
    pur.productSummary.toLowerCase().includes(q) ||
    pur.status.toLowerCase().includes(q)
  )
}

export function ProductRelatedPurchasesPanel({
  product,
  onCountChange,
}: ProductRelatedPurchasesPanelProps) {
  const related = useMemo(() => purchasesForProduct(product), [product])

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShoppingCart aria-hidden className="size-4 text-primary" />
          Compras
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/compras">Ver módulo compras</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <RelatedEntityList
          items={related}
          searchPlaceholder="Buscar órdenes de compra…"
          searchFilter={(pur, q) => searchPurchase(pur, q)}
          emptyMessage={`No hay órdenes de compra vinculadas a ${product.name}.`}
          renderItem={(pur) => (
            <li key={pur.id}>
              <Link
                to={`/compras/${pur.id}`}
                className="group flex flex-col gap-2 rounded-md border border-border px-3 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground group-hover:text-primary">
                    {pur.reference}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pur.supplier} · {pur.orderDate}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Badge variant={purchaseStatusVariant(pur.status)}>{pur.status}</Badge>
                  <span className="font-semibold tabular-nums">{pur.amount}</span>
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
