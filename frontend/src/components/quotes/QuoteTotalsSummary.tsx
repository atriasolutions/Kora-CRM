import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { ExchangeRatesPanel } from '@/components/shared/ExchangeRatesPanel'
import { cn } from '@/lib/utils'

type QuoteTotalsSummaryProps = {
  quote: QuoteDetail
  className?: string
}

export function QuoteTotalsSummary({ quote, className }: QuoteTotalsSummaryProps) {
  const showDiscount =
    quote.discountAmount &&
    quote.discountAmount !== '$0' &&
    quote.discountAmount !== '−$0' &&
    quote.discountAmount !== '-$0'

  const rows = [
    { id: 'subtotal', label: 'Subtotal líneas', value: quote.subtotal },
    ...(showDiscount
      ? [
          {
            id: 'discount',
            label: `Descuento global (${quote.discountPercent})`,
            value: quote.discountAmount,
          },
        ]
      : []),
    { id: 'tax', label: quote.taxPercent, value: quote.taxAmount },
  ]

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Totales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums text-foreground">{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold tabular-nums text-primary">{quote.amount}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Moneda de facturación: {quote.currency} · Versión {quote.version}
        </p>
        <ExchangeRatesPanel rates={quote} className="mt-3 border-0 bg-muted/30 shadow-none" />
      </CardContent>
    </Card>
  )
}
