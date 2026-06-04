import { pool } from '../db/pool.js'
import type { ExchangeRateSnapshot } from '../types/currency.js'

type ExchangeRateRow = {
  rate_date: Date | string
  uf_clp: string | number
  usd_clp: string | number
  eur_clp: string | number
  source: string
  fetched_at: Date
}

function mapRow(row: ExchangeRateRow): ExchangeRateSnapshot {
  const date =
    row.rate_date instanceof Date
      ? row.rate_date.toISOString().slice(0, 10)
      : String(row.rate_date).slice(0, 10)

  return {
    rateDate: date,
    ufClp: Number(row.uf_clp),
    usdClp: Number(row.usd_clp),
    eurClp: Number(row.eur_clp),
    source: row.source,
    fetchedAt: row.fetched_at.toISOString(),
  }
}

export async function getExchangeRatesForDate(
  rateDate: string,
): Promise<ExchangeRateSnapshot | null> {
  const result = await pool.query<ExchangeRateRow>(
    `SELECT rate_date, uf_clp, usd_clp, eur_clp, source, fetched_at
     FROM crm_exchange_rates
     WHERE rate_date = $1::date`,
    [rateDate],
  )
  const row = result.rows[0]
  return row ? mapRow(row) : null
}

export async function getLatestExchangeRates(): Promise<ExchangeRateSnapshot | null> {
  const result = await pool.query<ExchangeRateRow>(
    `SELECT rate_date, uf_clp, usd_clp, eur_clp, source, fetched_at
     FROM crm_exchange_rates
     ORDER BY rate_date DESC
     LIMIT 1`,
  )
  const row = result.rows[0]
  return row ? mapRow(row) : null
}

export async function upsertExchangeRates(params: {
  rateDate: string
  ufClp: number
  usdClp: number
  eurClp: number
  source?: string
}): Promise<ExchangeRateSnapshot> {
  const result = await pool.query<ExchangeRateRow>(
    `INSERT INTO crm_exchange_rates (rate_date, uf_clp, usd_clp, eur_clp, source)
     VALUES ($1::date, $2, $3, $4, $5)
     ON CONFLICT (rate_date) DO UPDATE SET
       uf_clp = EXCLUDED.uf_clp,
       usd_clp = EXCLUDED.usd_clp,
       eur_clp = EXCLUDED.eur_clp,
       source = EXCLUDED.source,
       fetched_at = now()
     RETURNING rate_date, uf_clp, usd_clp, eur_clp, source, fetched_at`,
    [
      params.rateDate,
      params.ufClp,
      params.usdClp,
      params.eurClp,
      params.source ?? 'mindicador.cl',
    ],
  )
  return mapRow(result.rows[0]!)
}

export async function ensureExchangeRatesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_exchange_rates (
      rate_date   DATE PRIMARY KEY,
      uf_clp      NUMERIC(18, 6) NOT NULL,
      usd_clp     NUMERIC(18, 6) NOT NULL,
      eur_clp     NUMERIC(18, 6) NOT NULL,
      source      TEXT NOT NULL DEFAULT 'mindicador.cl',
      fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}
