import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import {
  isManualPurchaseLine,
  purchaseLineDescription,
  purchaseLineKind,
} from '@/lib/purchase-line-item'
import { purchaseLineUnitShort } from '@/lib/purchase-line-units'
import {
  confirmedIngresoQtyBySkuForPurchase,
  pendingWarehouseQtyForPurchaseLine,
} from '@/lib/purchase-inbound-stock'
import { isCatalogStockLine } from '@/lib/purchase-line-item'
import { normalizeSku } from '@/lib/stock-sku'

type PurchaseLineItemsPanelProps = {
  purchase: PurchaseDetail
}

export function PurchaseLineItemsPanel({ purchase }: PurchaseLineItemsPanelProps) {
  const { lineItems } = purchase

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Líneas de la orden</CardTitle>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 ? (
          <div className="py-8 text-center">
            <Package aria-hidden className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin líneas registradas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrega productos o servicios a esta orden de compra.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Descripción</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Unidad</th>
                  <th className="px-4 py-2.5 font-medium text-end">Solicitadas</th>
                  <th className="px-4 py-2.5 font-medium text-end">Ingresadas</th>
                  <th className="px-4 py-2.5 font-medium text-end">Pend. bodega</th>
                  <th className="px-4 py-2.5 font-medium text-end">P. unit.</th>
                  <th className="px-4 py-2.5 font-medium text-end">Desc.</th>
                  <th className="px-4 py-2.5 font-medium text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => {
                  const manual = isManualPurchaseLine(li)
                  const catalog = isCatalogStockLine(li)
                  const ingressed = catalog
                    ? confirmedIngresoQtyBySkuForPurchase(purchase.id).get(
                        normalizeSku(li.sku!),
                      ) ?? 0
                    : null
                  const pendingWh = catalog
                    ? pendingWarehouseQtyForPurchaseLine(purchase.id, li)
                    : null
                  return (
                    <tr key={li.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        {!manual && li.productId ? (
                          <Link
                            to={`/productos/${li.productId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {purchaseLineDescription(li)}
                          </Link>
                        ) : (
                          <p className="font-medium text-foreground">
                            {purchaseLineDescription(li)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={manual ? 'secondary' : 'outline'} className="font-normal">
                          {purchaseLineKind(li) === 'manual' ? 'Servicio' : 'Producto'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{li.sku || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {purchaseLineUnitShort(li)}
                      </td>
                      <td className="px-4 py-3 text-end font-medium tabular-nums">
                        {li.quantity}
                      </td>
                      <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                        {ingressed != null ? ingressed : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-end tabular-nums',
                          pendingWh != null && pendingWh > 0
                            ? 'font-medium text-sky-700 dark:text-sky-300'
                            : 'text-muted-foreground',
                        )}
                      >
                        {pendingWh != null ? pendingWh : '—'}
                      </td>
                      <td className="px-4 py-3 text-end text-muted-foreground tabular-nums">
                        {li.unitPrice}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-end tabular-nums',
                          li.discount !== '0%'
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground',
                        )}
                      >
                        {li.discount}
                      </td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums">
                        {li.total}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
