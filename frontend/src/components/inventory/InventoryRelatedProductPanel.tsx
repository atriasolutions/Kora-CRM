import { ChevronRight, Boxes } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { isApiEnabled } from '@/api/config'
import { productListSeed } from '@/data/products.mock'
import { getRegistryProducts } from '@/data/products-registry-store'
import { productForInventorySku } from '@/lib/inventory-relations'
import { productStatusVariant } from '@/lib/product-display'

type InventoryRelatedProductPanelProps = {
  inventory: InventoryDetail
  onCountChange?: (hasProduct: boolean) => void
}

export function InventoryRelatedProductPanel({
  inventory,
  onCountChange,
}: InventoryRelatedProductPanelProps) {
  const product = useMemo(() => {
    const catalog = isApiEnabled() ? getRegistryProducts() : productListSeed
    return productForInventorySku(catalog, inventory.sku)
  }, [inventory.sku])

  useEffect(() => {
    onCountChange?.(Boolean(product))
  }, [onCountChange, product])

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Producto del catálogo</CardTitle>
      </CardHeader>
      <CardContent>
        {!product ? (
          <div className="py-8 text-center">
            <Boxes aria-hidden className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin producto vinculado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No hay un producto con SKU {inventory.sku} en el catálogo.
            </p>
          </div>
        ) : (
          <Link
            to={`/productos/${product.id}`}
            className="group flex flex-col gap-3 rounded-lg border border-border px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                <Boxes aria-hidden className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground group-hover:text-primary">
                  {product.name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {product.sku} · {product.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              <Badge variant={productStatusVariant(product.status)}>{product.status}</Badge>
              <span className="text-base font-semibold tabular-nums">{product.price}</span>
              <ChevronRight
                aria-hidden
                className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
