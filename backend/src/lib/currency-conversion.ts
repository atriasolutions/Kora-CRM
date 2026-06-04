import type { ProductCurrency, ExchangeRateSnapshot } from '../types/currency.js'
import { normalizeProductCurrency } from '../types/currency.js'

export function chileDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date)
}

export function chileDateTimeParts(date = new Date()): {
  date: string
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number.parseInt(get('hour'), 10) || 0,
    minute: Number.parseInt(get('minute'), 10) || 0,
  }
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

export function clpAmountToCents(clp: number): number {
  return Math.round(clp * 100)
}

export function centsToClpAmount(cents: number): number {
  return cents / 100
}

export function rateForCurrency(
  currency: ProductCurrency,
  rates: ExchangeRateSnapshot,
): number | null {
  switch (currency) {
    case 'UF':
      return rates.ufClp
    case 'USD':
      return rates.usdClp
    case 'EUR':
      return rates.eurClp
    default:
      return null
  }
}

export function snapshotFromRates(
  rates: ExchangeRateSnapshot,
  usedCurrencies: Iterable<ProductCurrency>,
): {
  exchangeRateDate: string | null
  exchangeRateUf: number | null
  exchangeRateUsd: number | null
  exchangeRateEur: number | null
} {
  const used = new Set(
    [...usedCurrencies].map((c) => normalizeProductCurrency(c)).filter((c) => c !== 'CLP'),
  )
  if (used.size === 0) {
    return {
      exchangeRateDate: null,
      exchangeRateUf: null,
      exchangeRateUsd: null,
      exchangeRateEur: null,
    }
  }

  return {
    exchangeRateDate: rates.rateDate,
    exchangeRateUf: used.has('UF') ? rates.ufClp : null,
    exchangeRateUsd: used.has('USD') ? rates.usdClp : null,
    exchangeRateEur: used.has('EUR') ? rates.eurClp : null,
  }
}
