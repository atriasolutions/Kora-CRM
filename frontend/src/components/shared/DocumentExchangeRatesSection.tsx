import {
  formatExchangeRateLabel,
  PRODUCT_CURRENCIES,
  type ExchangeRateSnapshot,
  type ProductCurrency,
} from '@/lib/currency'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'

type DocumentExchangeRatesSectionProps = {
  issueDate: string
  /** Currencies present in document lines; if empty, shows UF/USD/EUR once date is set. */
  currencies?: ProductCurrency[]
}

function rateValueForCurrency(
  rates: ExchangeRateSnapshot,
  currency: ProductCurrency,
): number {
  switch (currency) {
    case 'UF':
      return rates.ufClp
    case 'USD':
      return rates.usdClp
    case 'EUR':
      return rates.eurClp
    default:
      return 0
  }
}

export function DocumentExchangeRatesSection({
  issueDate,
  currencies,
}: DocumentExchangeRatesSectionProps) {
  const { rates, loading, error } = useExchangeRatesForDate(issueDate)
  const foreign = (currencies ?? []).filter(
    (c): c is Exclude<ProductCurrency, 'CLP'> => c !== 'CLP',
  )
  const shown: Exclude<ProductCurrency, 'CLP'>[] =
    foreign.length > 0
      ? [...new Set(foreign)]
      : (PRODUCT_CURRENCIES.filter((c) => c !== 'CLP') as Exclude<
          ProductCurrency,
          'CLP'
        >[])

  if (!issueDate.trim()) {
    return (
      <section className="space-y-1 rounded-lg border border-border bg-muted/15 p-4">
        <h3 className="text-sm font-semibold text-foreground">Tipo de cambio</h3>
        <p className="text-xs text-muted-foreground">
          Indica la fecha de emisión para convertir productos en UF, USD o EUR a CLP.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-2 rounded-lg border border-border bg-muted/15 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Tipo de cambio</h3>
        <p className="text-xs text-muted-foreground">
          Los totales se registran en CLP. Productos en otra divisa se convierten con los
          indicadores de la fecha de emisión.
        </p>
      </div>
      <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Cargando indicadores…</p>
        ) : error ? (
          <p className="text-amber-700 dark:text-amber-300">{error}</p>
        ) : (
          <ul className="space-y-1 font-medium tabular-nums text-foreground">
            {shown.map((currency) => (
              <li key={currency}>
                {formatExchangeRateLabel(currency, rateValueForCurrency(rates, currency))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
