import { MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryProductSummary } from '@/lib/inventory-aggregate'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import { deriveInventoryStatusFromRow } from '@/lib/inventory-status'

type InventoryWarehouseBreakdownPanelProps = {
  product: InventoryProductSummary
}

export function InventoryWarehouseBreakdownPanel({
  product,
}: InventoryWarehouseBreakdownPanelProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Existencias por bodega</CardTitle>
        <p className="text-sm text-muted-foreground">
          Desglose de {product.productName} ({product.sku}) en {product.warehouseCount}{' '}
          ubicación{product.warehouseCount === 1 ? '' : 'es'}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Bodega</th>
                <th className="px-4 py-3 text-right">Disponible</th>
                <th className="px-4 py-3 text-right">Reservado</th>
                <th className="px-4 py-3 text-right">En bodega</th>
                <th className="px-4 py-3 text-right">Mínimo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último movimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {product.locationRows.map((row) => {
                const rowStatus = deriveInventoryStatusFromRow(row)
                return (
                <tr key={row.id} className="bg-card hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <MapPin aria-hidden className="size-3.5 text-muted-foreground" />
                      {row.location}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {row.availableQtyNum ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.reservedQtyNum ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.onHandQtyNum ?? row.quantityNum}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.minStock}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={inventoryStatusVariant(rowStatus)}>{rowStatus}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.lastMovement}</td>
                </tr>
              )})}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/30 font-semibold">
                <td className="px-4 py-3">Total producto</td>
                <td className="px-4 py-3 text-right tabular-nums">{product.availableQtyNum}</td>
                <td className="px-4 py-3 text-right tabular-nums">{product.reservedQtyNum}</td>
                <td className="px-4 py-3 text-right tabular-nums">{product.onHandQtyNum}</td>
                <td className="px-4 py-3 text-right tabular-nums">{product.minStockLabel}</td>
                <td className="px-4 py-3" colSpan={2}>
                  <Badge variant={inventoryStatusVariant(product.status)}>
                    {product.status}
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
