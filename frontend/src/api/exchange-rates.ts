import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { RecordNotFoundError } from '@/api/errors'
import type { ExchangeRateSnapshot } from '@/lib/currency'

const BASE = `${API_V1}/exchange-rates`

export async function getExchangeRatesTodayApi(): Promise<ExchangeRateSnapshot> {
  const res = await fetchJSON<{ data: ExchangeRateSnapshot }>(`${BASE}/today`)
  return res.data
}

export async function getExchangeRatesForDateApi(
  date: string,
): Promise<ExchangeRateSnapshot> {
  const res = await fetchJSON<{ data: ExchangeRateSnapshot }>(
    `${BASE}?date=${encodeURIComponent(date)}`,
  )
  return res.data
}

/** Indicadores persistidos en BD; devuelve null si no hay registro para la fecha. */
export async function getStoredExchangeRatesApi(
  date?: string,
): Promise<ExchangeRateSnapshot | null> {
  const qs = date?.trim() ? `?date=${encodeURIComponent(date.trim().slice(0, 10))}` : ''
  try {
    const res = await fetchJSON<{ data: ExchangeRateSnapshot }>(`${BASE}/stored${qs}`)
    return res.data
  } catch (error) {
    if (error instanceof RecordNotFoundError) return null
    throw error
  }
}

export async function updateStoredExchangeRatesApi(body: {
  rateDate?: string
  ufClp: number
  usdClp: number
  eurClp: number
}): Promise<ExchangeRateSnapshot> {
  const res = await fetchJSON<{ data: ExchangeRateSnapshot }>(`${BASE}/stored`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

/** Consulta findic.cl (o mindicador.cl) y sobrescribe los indicadores almacenados para la fecha. */
export async function syncExchangeRatesApi(
  rateDate?: string,
): Promise<ExchangeRateSnapshot> {
  const res = await fetchJSON<{ data: ExchangeRateSnapshot }>(`${BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rateDate?.trim() ? { rateDate: rateDate.trim().slice(0, 10) } : {}),
  })
  return res.data
}
