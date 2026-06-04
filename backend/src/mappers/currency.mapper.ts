import type { DocumentExchangeRates } from '../types/currency.js'
import { normalizeProductCurrency } from '../types/currency.js'

export function mapDocumentExchangeRates(row: {
  exchange_rate_date?: Date | string | null
  exchange_rate_uf?: string | number | null
  exchange_rate_usd?: string | number | null
  exchange_rate_eur?: string | number | null
}): DocumentExchangeRates {
  const date = row.exchange_rate_date
  return {
    exchangeRateDate: date
      ? date instanceof Date
        ? date.toISOString().slice(0, 10)
        : String(date).slice(0, 10)
      : null,
    exchangeRateUf:
      row.exchange_rate_uf != null ? Number(row.exchange_rate_uf) : null,
    exchangeRateUsd:
      row.exchange_rate_usd != null ? Number(row.exchange_rate_usd) : null,
    exchangeRateEur:
      row.exchange_rate_eur != null ? Number(row.exchange_rate_eur) : null,
  }
}

export function formatForeignAmount(
  amount: number,
  currency: ReturnType<typeof normalizeProductCurrency>,
): string {
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount)
  }
  const formatted = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: currency === 'UF' ? 2 : 2,
    maximumFractionDigits: currency === 'UF' ? 4 : 2,
  }).format(amount)
  return `${formatted} ${currency}`
}
