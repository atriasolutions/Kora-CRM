import { Package } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import { cn } from '@/lib/utils'

type StockReceiptLineItemsPanelProps = {
  lineItems: StockReceiptLineItem[]
  className?: string
}

export function StockReceiptLineItemsPanel({
  lineItems,
  className,
}: StockReceiptLineItemsPanelProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Líneas de ingreso</CardTitle>
      </CardHeader>
      <CardContent>
        {lineItems.length === 0 ? (
          <div className="py-8 text-center">
            <Package aria-hidden className="mx-auto mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Sin líneas registradas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrega productos y cantidades desde Editar (solo borradores).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 font-medium text-end">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {li.sku || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {li.productId?.trim() ? (
                        <Link
                          to={`/productos/${li.productId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {li.product || li.sku}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">
                          {li.product || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-medium tabular-nums">
                      {li.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
