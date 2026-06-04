import type { PoolClient } from 'pg'

/** Namespace pg_advisory_xact_lock para correlativos ING-AAAA-####. */
const RECEIPT_NUMBER_LOCK_NS = 0x5a49

function yearPrefix(year: number): string {
  return `ING-${year}-`
}

async function maxSequenceForPrefix(
  client: PoolClient,
  prefix: string,
): Promise<number> {
  const result = await client.query<{ number: string }>(
    `SELECT number FROM crm_stock_receipts
     WHERE number LIKE $1
     ORDER BY number DESC
     LIMIT 1`,
    [`${prefix}%`],
  )
  const last = result.rows[0]?.number
  if (!last?.startsWith(prefix)) return 0
  const n = Number.parseInt(last.slice(prefix.length), 10)
  return Number.isFinite(n) ? n : 0
}

export function formatStockReceiptNumber(year: number, sequence: number): string {
  return `${yearPrefix(year)}${String(sequence).padStart(4, '0')}`
}

/**
 * Asigna el siguiente correlativo dentro de la transacción actual (serializa por año).
 */
export async function allocateNextStockReceiptNumber(
  client: PoolClient,
  year = new Date().getFullYear(),
): Promise<string> {
  await client.query(`SELECT pg_advisory_xact_lock($1::int, $2::int)`, [
    RECEIPT_NUMBER_LOCK_NS,
    year,
  ])
  const prefix = yearPrefix(year)
  const maxSeq = await maxSequenceForPrefix(client, prefix)
  return formatStockReceiptNumber(year, maxSeq + 1)
}

export function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505'
}
