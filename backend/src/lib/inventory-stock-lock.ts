import type { Pool, PoolClient } from 'pg'

import { setTenantLocal } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from './tenant-context.js'

/** Namespace para pg_advisory_xact_lock (evita colisiones con otros módulos). */
const LOCK_NAMESPACE = 0x5a43

export function normalizeSkuKey(sku: string): string {
  return sku.trim().toLowerCase()
}

/** Dos enteros de 32 bits estables por SKU (lock a nivel transacción). */
export function skuAdvisoryLockKeys(sku: string): [number, number] {
  const key = normalizeSkuKey(sku)
  let h1 = LOCK_NAMESPACE
  let h2 = 0x534b55 // 'SKU'
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i)
    h1 = (Math.imul(h1, 31) + c) | 0
    h2 = (Math.imul(h2, 37) + c) | 0
  }
  return [h1, h2]
}

/**
 * Serializa todas las operaciones de stock del mismo SKU dentro de la transacción actual.
 * Debe llamarse antes de leer/actualizar inventario o reservas de ese SKU.
 */
export async function acquireSkuStockLock(
  client: PoolClient,
  sku: string,
): Promise<void> {
  const normalized = normalizeSkuKey(sku)
  if (!normalized) return
  const [k1, k2] = skuAdvisoryLockKeys(normalized)
  await client.query(`SELECT pg_advisory_xact_lock($1::int, $2::int)`, [k1, k2])
}

/** Evita deadlocks bloqueando SKUs siempre en el mismo orden. */
export async function acquireSkuStockLocksOrdered(
  client: PoolClient,
  skus: string[],
): Promise<void> {
  const unique = [...new Set(skus.map(normalizeSkuKey).filter(Boolean))].sort()
  for (const sku of unique) {
    await acquireSkuStockLock(client, sku)
  }
}

/** Bloquea todas las filas de inventario del SKU (todas las bodegas). */
export async function lockAllInventoryRowsBySku(
  client: PoolClient,
  sku: string,
): Promise<void> {
  await acquireSkuStockLock(client, sku)
  await client.query(
    `SELECT id
     FROM crm_inventory_positions
     WHERE lower(trim(sku)) = lower(trim($1))
       AND tenant_id = $2
     FOR UPDATE`,
    [sku.trim(), getTenantIdOrDefault()],
  )
}

export function isPgSerializationError(err: unknown): boolean {
  const code = (err as { code?: string })?.code
  return code === '40001' || code === '40P01'
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const MAX_STOCK_TX_ATTEMPTS = 5

/**
 * Ejecuta una transacción con reintentos ante deadlock o fallo de serialización.
 */
export async function withStockTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_STOCK_TX_ATTEMPTS; attempt++) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await setTenantLocal(client)
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined)
      lastError = err
      if (isPgSerializationError(err) && attempt < MAX_STOCK_TX_ATTEMPTS) {
        await sleep(40 * attempt * attempt)
        continue
      }
      throw err
    } finally {
      client.release()
    }
  }
  throw lastError
}
