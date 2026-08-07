import pg from 'pg'

import { env } from '../config/env.js'

// Evita que columnas DATE de PostgreSQL se conviertan a Date UTC (desfase de un día en Chile).
pg.types.setTypeParser(1082, (value) => value)

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: env.pgPoolMax,
  idleTimeoutMillis: env.pgPoolIdleTimeoutMs,
  connectionTimeoutMillis: env.pgPoolConnectionTimeoutMs,
})

export async function checkDatabaseConnection(): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
    return true
  } finally {
    client.release()
  }
}
