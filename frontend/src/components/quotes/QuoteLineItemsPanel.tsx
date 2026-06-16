import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { QuoteLineItem } from '@/data/quote-detail.mock'
import { useStockSync } from '@/hooks/use-stock-sync'
import {
  enrichInventoryListItem,
  findInventoryBySku,
  lineShouldReserveStock,
} from '@/lib/stock-service'
import { cn } from '@/lib/utils'

type QuoteLineItemsPanelProps = {
  lineItems: QuoteLineItem[]
  className?: string
  showAvailability?: boolean
}

export function QuoteLineItemsPanel({
  lineItems,
  className,
  showAvailability = false,
}: QuoteLineItemsPanelProps) {
  useStockSync()
  const showDeferredCol = lineItems.some((li) => li.deferredPayment === true)
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Líneas de cotización</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {lineItems.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Esta cotización no tiene líneas de producto o servicio.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Descripción</th>
                  <th className="px-4 py-2 font-medium">Cant.</th>
                  <th className="px-4 py-2 font-medium">Precio orig.</th>
                  <th className="px-4 py-2 font-medium">Precio CLP</th>
                  <th className="px-4 py-2 font-medium">Desc.</th>
                  {showDeferredCol ? (
                    <th className="px-4 py-2 font-medium">Plazo entrega</th>
                  ) : null}
                  <th className="px-4 py-2 font-medium">Total</th>
                  {showAvailability ? (
                    <th className="px-4 py-2 font-medium">Disponible</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => {
                  const inv = showAvailability ? findInventoryBySku(li.sku) : undefined
                  const available =
                    inv && lineShouldReserveStock(li.sku)
                      ? enrichInventoryListItem(inv).availableQtyNum
                      : null
                  const low =
                    available != null && lineShouldReserveStock(li.sku) && available < li.quantity

                  return (
                    <tr key={li.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {li.sku}
                      </td>
                      <td className="px-4 py-3 font-medium">{li.description}</td>
                      <td className="px-4 py-3 tabular-nums">{li.quantity}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {li.unitPriceOriginal && li.priceCurrency && li.priceCurrency !== 'CLP'
                          ? li.unitPriceOriginal
                          : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{li.unitPrice}</td>
                      <td className="px-4 py-3">{li.discount}</td>
                      {showDeferredCol ? (
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {li.deferredPayment
                            ? li.deferredPaymentText?.trim() || '—'
                            : '—'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-semibold tabular-nums">{li.total}</td>
                      {showAvailability ? (
                        <td
                          className={cn(
                            'px-4 py-3 text-xs tabular-nums',
                            low ? 'font-medium text-rose-600' : 'text-muted-foreground',
                          )}
                        >
                          {available != null ? `${available}` : '—'}
                        </td>
                      ) : null}
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
