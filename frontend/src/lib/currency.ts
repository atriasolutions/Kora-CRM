export const PRODUCT_CURRENCIES = ['CLP', 'UF', 'USD', 'EUR'] as const

export type ProductCurrency = (typeof PRODUCT_CURRENCIES)[number]

export type ExchangeRateSnapshot = {
  rateDate: string
  ufClp: number
  usdClp: number
  eurClp: number
  source?: string
  fetchedAt?: string
}

export type DocumentExchangeRates = {
  exchangeRateDate?: string | null
  exchangeRateUf?: number | null
  exchangeRateUsd?: number | null
  exchangeRateEur?: number | null
}

export const PRODUCT_CURRENCY_LABELS: Record<ProductCurrency, string> = {
  CLP: 'Peso chileno (CLP)',
  UF: 'Unidad de fomento (UF)',
  USD: 'Dólar (USD)',
  EUR: 'Euro (EUR)',
}

export function normalizeProductCurrency(
  value: string | null | undefined,
): ProductCurrency {
  const upper = value?.trim().toUpperCase()
  if (upper === 'UF' || upper === 'USD' || upper === 'EUR') return upper
  return 'CLP'
}

export function convertAmountToClp(
  amount: number,
  currency: ProductCurrency,
  rates: ExchangeRateSnapshot,
): number {
  if (!Number.isFinite(amount)) return 0
  switch (currency) {
    case 'UF':
      return amount * rates.ufClp
    case 'USD':
      return amount * rates.usdClp
    case 'EUR':
      return amount * rates.eurClp
    default:
      return amount
  }
}

export function formatForeignAmount(
  amount: number,
  currency: ProductCurrency,
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

export function chileDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(
    date,
  )
}

export function formatExchangeRateFetchedAt(iso: string | undefined): string {
  if (!iso?.trim()) return '—'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(parsed)
}

export function formatExchangeRateLabel(
  currency: Exclude<ProductCurrency, 'CLP'>,
  value: number,
): string {
  const formatted = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `1 ${currency} = $ ${formatted} CLP`
}

/** dd/MM/yyyy para PDF y textos legales. */
export function formatDocumentRateDate(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-')
    return `${d}/${m}/${y}`
  }
  return trimmed
}

export function formatUfRatePdfLine(rateDate: string, ufClp: number): string {
  return `Valor de la UF al día ${formatDocumentRateDate(rateDate)}: $ ${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ufClp)}`
}

export function formatForeignRatePdfLine(
  currency: Exclude<ProductCurrency, 'CLP'>,
  rateDate: string,
  value: number,
): string {
  if (currency === 'UF') return formatUfRatePdfLine(rateDate, value)
  const label = currency === 'USD' ? 'dólar' : 'euro'
  return `Valor del ${label} al día ${formatDocumentRateDate(rateDate)}: $ ${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`
}

export function documentHasForeignExchange(
  rates: DocumentExchangeRates | null | undefined,
): boolean {
  if (!rates?.exchangeRateDate) return false
  return (
    rates.exchangeRateUf != null ||
    rates.exchangeRateUsd != null ||
    rates.exchangeRateEur != null
  )
}

export function documentExchangeRatesFromDetail(
  detail: DocumentExchangeRates,
): DocumentExchangeRates {
  return {
    exchangeRateDate: detail.exchangeRateDate ?? null,
    exchangeRateUf: detail.exchangeRateUf ?? null,
    exchangeRateUsd: detail.exchangeRateUsd ?? null,
    exchangeRateEur: detail.exchangeRateEur ?? null,
  }
}
