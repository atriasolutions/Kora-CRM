import {
  ContactFormDateInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import {
  formatExchangeRateLabel,
  PRODUCT_CURRENCIES,
  PRODUCT_CURRENCY_LABELS,
  type ExchangeRateSnapshot,
  type ProductCurrency,
} from '@/lib/currency'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'

type QuoteCurrencySectionProps = {
  issueDate: string
  quoteCurrency: ProductCurrency
  onIssueDateChange: (issueDate: string) => void
  onQuoteCurrencyChange: (currency: ProductCurrency) => void
  readOnly?: boolean
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

export function QuoteCurrencySection({
  issueDate,
  quoteCurrency,
  onIssueDateChange,
  onQuoteCurrencyChange,
  readOnly = false,
}: QuoteCurrencySectionProps) {
  const { rates, loading, error } = useExchangeRatesForDate(issueDate)
  const showRates = quoteCurrency !== 'CLP'

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/15 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Moneda y tipo de cambio</h3>
        <p className="text-xs text-muted-foreground">
          Los totales se facturan en CLP. Si cotizas en UF, USD o EUR, indica la fecha de
          referencia para calcular los montos.
        </p>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <ContactFormSelect
          id="quote-currency"
          label="Moneda de cotización"
          value={quoteCurrency}
          disabled={readOnly}
          options={PRODUCT_CURRENCIES.map((currency) => ({
            value: currency,
            label: PRODUCT_CURRENCY_LABELS[currency],
          }))}
          onChange={(value) => onQuoteCurrencyChange(value as ProductCurrency)}
        />
        <ContactFormDateInput
          id="quote-issue-date"
          label="Fecha tipo de cambio"
          value={issueDate}
          disabled={readOnly}
          onChange={onIssueDateChange}
        />
      </div>
      {showRates ? (
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Cargando indicadores…</p>
          ) : error ? (
            <p className="text-amber-700 dark:text-amber-300">{error}</p>
          ) : (
            <p className="font-medium tabular-nums text-foreground">
              {formatExchangeRateLabel(
                quoteCurrency,
                rateValueForCurrency(rates, quoteCurrency),
              )}
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
