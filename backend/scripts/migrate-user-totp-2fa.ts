/**
 * TOTP / 2FA en usuarios.
 * Uso: npm run db:migrate-user-totp-2fa
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Falta DATABASE_URL en backend/.env')
  process.exit(1)
}

const sqlPath = join(
  __dirname,
  '..',
  '..',
  'database',
  'postgres',
  'migrations',
  '20260609_user_totp_2fa.sql',
)

async function main() {
  const sql = readFileSync(sqlPath, 'utf8')
  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const check = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'crm_user_totp_challenges'
      ) AS exists`,
    )
    if (check.rows[0]?.exists) {
      console.log('Migración ya aplicada: TOTP 2FA.')
      return
    }
    await pool.query(sql)
    console.log('Migración aplicada: TOTP 2FA')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
