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
  exchangeRateDate: string | null
  exchangeRateUf: number | null
  exchangeRateUsd: number | null
  exchangeRateEur: number | null
}

export function isProductCurrency(value: string | null | undefined): value is ProductCurrency {
  if (!value) return false
  return (PRODUCT_CURRENCIES as readonly string[]).includes(value.toUpperCase())
}

export function normalizeProductCurrency(
  value: string | null | undefined,
): ProductCurrency {
  const upper = value?.trim().toUpperCase()
  if (upper === 'UF' || upper === 'USD' || upper === 'EUR') return upper
  return 'CLP'
}
