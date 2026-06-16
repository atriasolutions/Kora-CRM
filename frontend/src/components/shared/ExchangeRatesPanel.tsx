import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  documentHasForeignExchange,
  formatExchangeRateLabel,
  type DocumentExchangeRates,
} from '@/lib/currency'

type ExchangeRatesPanelProps = {
  rates: DocumentExchangeRates
  title?: string
  className?: string
}

export function ExchangeRatesPanel({
  rates,
  title = 'Tipos de cambio aplicados',
  className,
}: ExchangeRatesPanelProps) {
  if (!documentHasForeignExchange(rates)) return null

  const rows: { id: string; label: string }[] = []
  if (rates.exchangeRateUf != null) {
    rows.push({
      id: 'uf',
      label: formatExchangeRateLabel('UF', rates.exchangeRateUf),
    })
  }
  if (rates.exchangeRateUsd != null) {
    rows.push({
      id: 'usd',
      label: formatExchangeRateLabel('USD', rates.exchangeRateUsd),
    })
  }
  if (rates.exchangeRateEur != null) {
    rows.push({
      id: 'eur',
      label: formatExchangeRateLabel('EUR', rates.exchangeRateEur),
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Fecha de referencia:{' '}
          <span className="font-medium text-foreground">
            {rates.exchangeRateDate}
          </span>
        </p>
        {rows.map((row) => (
          <p key={row.id} className="font-medium tabular-nums text-foreground">
            {row.label}
          </p>
        ))}
        <p className="text-xs text-muted-foreground">
          Los montos en CLP se calcularon con estas tasas al emitir el documento.
        </p>
      </CardContent>
    </Card>
  )
}
