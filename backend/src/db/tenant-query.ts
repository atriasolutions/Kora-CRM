import type pg from 'pg'

import { pool } from './pool.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'

/** Activa RLS (`app.tenant_id`) en un cliente con transacción abierta. */
export async function setTenantLocal(client: pg.PoolClient): Promise<void> {
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [
    getTenantIdOrDefault(),
  ])
}

type QueryResult<T extends pg.QueryResultRow = pg.QueryResultRow> = pg.QueryResult<T>

/** Ejecuta SQL en un cliente que ya tiene transacción y tenant activos. */
export async function tenantClientQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  client: pg.PoolClient,
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return client.query<T>(text, params)
}

/**
 * Reutiliza una conexión y transacción para varias consultas del mismo request.
 * Reduce round-trips frente a llamar `tenantQuery` varias veces seguidas.
 */
export async function withTenantClient<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Ejecuta SQL con `SET LOCAL app.tenant_id` (RLS) en una transacción corta. */
export async function tenantQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return withTenantClient((client) => client.query<T>(text, params))
}

/** Consultas de plataforma (sin RLS / sin tenant en contexto). */
export async function platformQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}
