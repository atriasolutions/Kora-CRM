import pg from 'pg'

import { env } from '../config/env.js'

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
