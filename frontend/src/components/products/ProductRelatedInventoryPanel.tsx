import { Boxes, ChevronRight, MapPin } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductDetail } from '@/data/product-detail.mock'
import {
  getInventoryProductSummaryBySku,
  inventoryProductIdFromSku,
} from '@/lib/inventory-aggregate'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import { inventoryRowsForProduct } from '@/lib/product-relations'

type ProductRelatedInventoryPanelProps = {
  product: ProductDetail
  onCountChange?: (count: number) => void
}

function searchInventoryRow(
  row: { productName: string; sku: string; location: string },
  q: string,
): boolean {
  return (
    row.productName.toLowerCase().includes(q) ||
    row.sku.toLowerCase().includes(q) ||
    row.location.toLowerCase().includes(q)
  )
}

export function ProductRelatedInventoryPanel({
  product,
  onCountChange,
}: ProductRelatedInventoryPanelProps) {
  const rows = useMemo(() => inventoryRowsForProduct(product), [product])
  const summary = useMemo(
    () => (product.sku.trim() ? getInventoryProductSummaryBySku(product.sku) : null),
    [product.sku],
  )

  useEffect(() => {
    onCountChange?.(rows.length)
  }, [onCountChange, rows.length])

  const aggregatePath = product.sku.trim()
    ? `/inventario/${inventoryProductIdFromSku(product.sku)}`
    : null

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Boxes aria-hidden className="size-4 text-primary" />
          Inventario
        </CardTitle>
        {aggregatePath ? (
          <Button variant="outline" size="sm" asChild>
            <Link to={aggregatePath}>Vista consolidada por SKU</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Disponible consolidado:</span>
            <span className="font-semibold tabular-nums">{summary.availableLabel}</span>
            <Badge variant={inventoryStatusVariant(summary.status)}>{summary.status}</Badge>
            <span className="text-xs text-muted-foreground">
              {summary.warehouseCount} bodega{summary.warehouseCount === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}

        <RelatedEntityList
          items={rows}
          searchPlaceholder="Buscar bodegas…"
          searchFilter={(row, q) => searchInventoryRow(row, q)}
          emptyMessage={
            product.sku.trim()
              ? `No hay existencias registradas para el SKU ${product.sku}. Crea un ingreso o una compra recibida para generar stock.`
              : 'Asigna un SKU al producto para vincular existencias en inventario.'
          }
          renderItem={(row) => (
            <li key={row.id}>
              <Link
                to={`/inventario/${row.id}`}
                className="group flex flex-col gap-2 rounded-md border border-border px-3 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground group-hover:text-primary">
                      {row.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.sku} · Último mov.: {row.lastMovement}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Badge variant={inventoryStatusVariant(row.status)}>{row.status}</Badge>
                  <span className="font-semibold tabular-nums">{row.quantity}</span>
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
