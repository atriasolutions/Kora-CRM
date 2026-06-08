import type pg from 'pg'

import { pool } from './pool.js'
import { getTenantIdOrDefault, requireTenantId } from '../lib/tenant-context.js'

/** Activa RLS (`app.tenant_id`) en un cliente con transacción abierta. */
export async function setTenantLocal(client: pg.PoolClient): Promise<void> {
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [
    getTenantIdOrDefault(),
  ])
}

type QueryResult<T extends pg.QueryResultRow = pg.QueryResultRow> = pg.QueryResult<T>

/** Ejecuta SQL con `SET LOCAL app.tenant_id` (RLS) en una transacción corta. */
export async function tenantQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const tenantId = requireTenantId()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId])
    const result = await client.query<T>(text, params)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Consultas de plataforma (sin RLS / sin tenant en contexto). */
export async function platformQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params)
}
