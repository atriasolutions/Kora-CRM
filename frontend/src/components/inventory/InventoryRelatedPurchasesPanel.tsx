import { ChevronRight, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { purchaseListSeed } from '@/data/purchases.mock'
import { purchasesForInventory } from '@/lib/inventory-relations'
import { purchaseStatusVariant } from '@/lib/purchase-display'

type InventoryRelatedPurchasesPanelProps = {
  inventory: InventoryDetail
  disabled?: boolean
  onCountChange?: (count: number) => void
}

export function InventoryRelatedPurchasesPanel({
  inventory,
  disabled: _disabled = false,
  onCountChange,
}: InventoryRelatedPurchasesPanelProps) {
  const related = useMemo(
    () => purchasesForInventory(purchaseListSeed, inventory),
    [inventory],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Compras relacionadas</CardTitle>
      </CardHeader>
      <CardContent>
        {related.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingCart aria-hidden className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin órdenes vinculadas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No hay compras asociadas a {inventory.sku}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {related.map((pur) => (
              <li key={pur.id}>
                <Link
                  to={`/compras/${pur.id}`}
                  className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                      <ShoppingCart aria-hidden className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary">
                        {pur.reference}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {pur.supplier} · {pur.productSummary}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{pur.orderDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <Badge variant={purchaseStatusVariant(pur.status)}>{pur.status}</Badge>
                    <span className="text-base font-semibold tabular-nums">{pur.amount}</span>
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
