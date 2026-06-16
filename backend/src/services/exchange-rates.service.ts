import { chileDateString } from '../lib/currency-conversion.js'
import { getTenantIdOrDefault, runWithTenantAsync } from '../lib/tenant-context.js'
import {
  ensureExchangeRatesTable,
  getExchangeRatesForDate,
  getLatestExchangeRates,
  upsertExchangeRates,
} from '../repositories/exchange-rates.repository.js'
import type { ExchangeRateSnapshot } from '../types/currency.js'

const FINDIC_API_URL = 'https://findic.cl/api/'
const MINDICADOR_API_URL = 'https://mindicador.cl/api'
const FETCH_TIMEOUT_MS = 12_000
const RETRY_DELAY_MS = 10 * 60 * 1000

type ExternalRates = {
  ufClp: number
  usdClp: number
  eurClp: number
  source: string
}

type FindicIndicator = {
  valor?: number
  fecha?: string
}

type FindicResponse = {
  fecha?: string
  uf?: FindicIndicator
  dolar?: FindicIndicator
  euro?: FindicIndicator
}

type MindicadorResponse = {
  uf?: { valor?: number }
  dolar?: { valor?: number }
  euro?: { valor?: number }
}

let retryTimer: ReturnType<typeof setTimeout> | null = null
let pendingRetryKey: string | null = null

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`${url} respondió ${response.status}`)
  }
  return (await response.json()) as T
}

function parseRateTriplet(
  ufClp: number,
  usdClp: number,
  eurClp: number,
  sourceLabel: string,
): ExternalRates {
  if (!Number.isFinite(ufClp) || !Number.isFinite(usdClp) || !Number.isFinite(eurClp)) {
    throw new Error(`Respuesta inválida de ${sourceLabel}`)
  }
  return { ufClp, usdClp, eurClp, source: sourceLabel }
}

export async function fetchFindicRates(): Promise<ExternalRates> {
  const data = await fetchJson<FindicResponse>(FINDIC_API_URL)
  return parseRateTriplet(
    Number(data.uf?.valor),
    Number(data.dolar?.valor),
    Number(data.euro?.valor),
    'findic.cl',
  )
}

export async function fetchMindicadorRates(): Promise<ExternalRates> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const data = await fetchJson<MindicadorResponse>(MINDICADOR_API_URL)
      return parseRateTriplet(
        Number(data.uf?.valor),
        Number(data.dolar?.valor),
        Number(data.euro?.valor),
        'mindicador.cl',
      )
    } catch (err) {
      lastError = err
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo consultar mindicador.cl')
}

export async function fetchExternalExchangeRates(): Promise<ExternalRates> {
  try {
    return await fetchFindicRates()
  } catch (findicErr) {
    console.warn('[exchange-rates] findic.cl falló:', errorMessage(findicErr))
    try {
      return await fetchMindicadorRates()
    } catch (mindicadorErr) {
      throw new Error(
        `findic.cl y mindicador.cl no disponibles (${errorMessage(findicErr)}; ${errorMessage(mindicadorErr)})`,
      )
    }
  }
}

function clearExchangeRatesRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
  pendingRetryKey = null
}

function scheduleExchangeRatesRetry(rateDate: string): void {
  const tenantId = getTenantIdOrDefault()
  const retryKey = `${tenantId}:${rateDate}`
  if (pendingRetryKey === retryKey) return

  clearExchangeRatesRetry()
  pendingRetryKey = retryKey

  console.warn(
    `[exchange-rates] findic.cl y mindicador.cl fallaron; reintento en 10 min para ${rateDate}`,
  )

  retryTimer = setTimeout(() => {
    retryTimer = null
    pendingRetryKey = null
    void runWithTenantAsync({ tenantId }, () => syncExchangeRatesForDate(rateDate))
      .then((snapshot) => {
        console.log(
          `[exchange-rates] Reintento OK (${snapshot.source}) ${snapshot.rateDate}: UF=${snapshot.ufClp} USD=${snapshot.usdClp} EUR=${snapshot.eurClp}`,
        )
      })
      .catch((err) => {
        console.error('[exchange-rates] Reintento fallido:', errorMessage(err))
      })
  }, RETRY_DELAY_MS)
}

export async function syncExchangeRatesForDate(
  rateDate = chileDateString(),
): Promise<ExchangeRateSnapshot> {
  await ensureExchangeRatesTable()
  try {
    const fetched = await fetchExternalExchangeRates()
    const snapshot = await upsertExchangeRates({
      rateDate,
      ufClp: fetched.ufClp,
      usdClp: fetched.usdClp,
      eurClp: fetched.eurClp,
      source: fetched.source,
    })
    clearExchangeRatesRetry()
    return snapshot
  } catch (err) {
    scheduleExchangeRatesRetry(rateDate)
    throw err
  }
}

export async function getOrFetchExchangeRatesForDate(
  rateDate = chileDateString(),
): Promise<ExchangeRateSnapshot> {
  await ensureExchangeRatesTable()
  const existing = await getExchangeRatesForDate(rateDate)
  if (existing) return existing

  try {
    return await syncExchangeRatesForDate(rateDate)
  } catch (err) {
    const fallback = await getLatestExchangeRates()
    if (fallback) {
      console.warn(
        `[exchange-rates] Fuentes externas no disponibles para ${rateDate}; usando tasas del ${fallback.rateDate} (${fallback.source})`,
      )
      return fallback
    }
    const message =
      err instanceof Error ? err.message : 'No se pudieron obtener tasas de cambio'
    throw new Error(
      `${message}. Configura tasas manualmente en Configuración o reintenta más tarde.`,
    )
  }
}

export async function getExchangeRatesForDocumentDate(
  issueDate: string | null | undefined,
): Promise<ExchangeRateSnapshot> {
  const date = issueDate?.trim().slice(0, 10) || chileDateString()
  return getOrFetchExchangeRatesForDate(date)
}

/** Solo lectura en BD; no consulta APIs externas ni rellena fechas faltantes. */
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
  clearExchangeRatesRetry()
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

/** Expuesto para pruebas del scheduler. */
export function resetExchangeRatesRetryState(): void {
  clearExchangeRatesRetry()
}
