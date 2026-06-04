import { ChevronRight, Warehouse } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { useInventoryRegistry } from '@/hooks/use-inventory-registry'
import { inventoryForPurchase } from '@/lib/purchase-relations'
import { inventoryStatusVariant } from '@/lib/inventory-display'

type PurchaseRelatedInventoryPanelProps = {
  purchase: PurchaseDetail
  disabled?: boolean
  onCountChange?: (count: number) => void
}

export function PurchaseRelatedInventoryPanel({
  purchase,
  disabled: _disabled = false,
  onCountChange,
}: PurchaseRelatedInventoryPanelProps) {
  const { allInventory } = useInventoryRegistry()
  const related = useMemo(
    () => inventoryForPurchase(allInventory, purchase, purchase.lineItems),
    [allInventory, purchase],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Inventario relacionado</CardTitle>
      </CardHeader>
      <CardContent>
        {related.length === 0 ? (
          <div className="py-8 text-center">
            <Warehouse aria-hidden className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin registros vinculados</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No hay existencias en inventario para los SKU de las líneas de {purchase.reference}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/inventario/${item.id}`}
                  className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                      <Warehouse aria-hidden className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.sku} · {item.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.lastMovement}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <Badge variant={inventoryStatusVariant(item.status)}>{item.status}</Badge>
                    <span className="text-sm font-medium tabular-nums">{item.quantity}</span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
