import { Package } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import {
  quoteHasActiveReservation,
  reservationsSummaryForQuote,
} from '@/lib/stock-service'

type QuoteStockBannerProps = {
  quoteId: string
  quoteStatus: string
  stockMessage?: string | null
}

export function QuoteStockBanner({
  quoteId,
  quoteStatus,
  stockMessage,
}: QuoteStockBannerProps) {
  const hasReservation = quoteHasActiveReservation(quoteId)
  const summary = hasReservation ? reservationsSummaryForQuote(quoteId) : null

  if (!stockMessage && !hasReservation && quoteStatus !== 'Aceptada') {
    return null
  }

  return (
    <Card className="border-violet-200 bg-violet-50/80 shadow-sm dark:border-violet-900 dark:bg-violet-950/40">
      <CardContent className="flex gap-3 p-4">
        <Package
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-violet-700 dark:text-violet-300"
        />
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-semibold text-violet-900 dark:text-violet-100">Stock e inventario</p>
          {stockMessage ? (
            <p className="text-violet-900/90 dark:text-violet-100/90">{stockMessage}</p>
          ) : null}
          {quoteStatus === 'Aceptada' && !hasReservation && !stockMessage ? (
            <p className="text-violet-900/90 dark:text-violet-100/90">
              Cotización aceptada sin reserva activa (líneas sin SKU en inventario o stock no
              controlado).
            </p>
          ) : null}
          {summary && summary.lines.length > 0 ? (
            <ul className="list-inside list-disc space-y-0.5 text-violet-900/90 dark:text-violet-100/90">
              {summary.lines.map((line) => (
                <li key={line.sku}>
                  {line.productName}: <strong>{line.qty}</strong> u. reservadas
                </li>
              ))}
            </ul>
          ) : null}
          {quoteStatus === 'Aceptada' ? (
            <p className="text-xs text-violet-800/80 dark:text-violet-200/70">
              Al facturar, la reserva pasa a la factura. Al emitir la factura (estado distinto de
              Borrador), se descuenta el stock físico. Si anulas la factura, el stock se revierte.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
