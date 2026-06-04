import { chileDateString } from '../lib/currency-conversion.js'
import {
  ensureExchangeRatesTable,
  getExchangeRatesForDate,
  getLatestExchangeRates,
  upsertExchangeRates,
} from '../repositories/exchange-rates.repository.js'
import type { ExchangeRateSnapshot } from '../types/currency.js'

const MINDICADOR_API_URL = 'https://mindicador.cl/api'

type MindicadorResponse = {
  uf?: { valor?: number }
  dolar?: { valor?: number }
  euro?: { valor?: number }
}

export async function fetchMindicadorRates(): Promise<{
  ufClp: number
  usdClp: number
  eurClp: number
}> {
  const response = await fetch(MINDICADOR_API_URL, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`mindicador.cl respondió ${response.status}`)
  }

  const data = (await response.json()) as MindicadorResponse
  const ufClp = Number(data.uf?.valor)
  const usdClp = Number(data.dolar?.valor)
  const eurClp = Number(data.euro?.valor)

  if (!Number.isFinite(ufClp) || !Number.isFinite(usdClp) || !Number.isFinite(eurClp)) {
    throw new Error('Respuesta inválida de mindicador.cl')
  }

  return { ufClp, usdClp, eurClp }
}

export async function syncExchangeRatesForDate(
  rateDate = chileDateString(),
): Promise<ExchangeRateSnapshot> {
  await ensureExchangeRatesTable()
  const fetched = await fetchMindicadorRates()
  return upsertExchangeRates({
    rateDate,
    ...fetched,
    source: 'mindicador.cl',
  })
}

export async function getOrFetchExchangeRatesForDate(
  rateDate = chileDateString(),
): Promise<ExchangeRateSnapshot> {
  await ensureExchangeRatesTable()
  const existing = await getExchangeRatesForDate(rateDate)
  if (existing) return existing
  return syncExchangeRatesForDate(rateDate)
}

export async function getExchangeRatesForDocumentDate(
  issueDate: string | null | undefined,
): Promise<ExchangeRateSnapshot> {
  const date = issueDate?.trim().slice(0, 10) || chileDateString()
  return getOrFetchExchangeRatesForDate(date)
}

/** Solo lectura en BD; no consulta mindicador.cl ni rellena fechas faltantes. */
export async function getStoredExchangeRates(
  date?: string,
): Promise<ExchangeRateSnapshot | null> {
  await ensureExchangeRatesTable()
  const target = date?.trim().slice(0, 10) || chileDateString()
  return getExchangeRatesForDate(target)
}

export async function updateStoredExchangeRates(params: {
  rateDate?: string
  ufClp: number
  usdClp: number
  eurClp: number
}): Promise<ExchangeRateSnapshot> {
  await ensureExchangeRatesTable()
  const rateDate = params.rateDate?.trim().slice(0, 10) || chileDateString()
  return upsertExchangeRates({
    rateDate,
    ufClp: params.ufClp,
    usdClp: params.usdClp,
    eurClp: params.eurClp,
    source: 'manual',
  })
}

export async function getPublicExchangeRates(
  date?: string,
): Promise<ExchangeRateSnapshot | null> {
  await ensureExchangeRatesTable()
  if (date?.trim()) {
    const forDate = await getExchangeRatesForDate(date.trim().slice(0, 10))
    if (forDate) return forDate
    try {
      return await syncExchangeRatesForDate(date.trim().slice(0, 10))
    } catch {
      return getLatestExchangeRates()
    }
  }

  const today = chileDateString()
  const todayRates = await getExchangeRatesForDate(today)
  if (todayRates) return todayRates

  try {
    return await syncExchangeRatesForDate(today)
  } catch {
    return getLatestExchangeRates()
  }
}
