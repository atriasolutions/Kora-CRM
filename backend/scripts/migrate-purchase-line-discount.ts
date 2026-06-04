/**
 * Añade discount_pct a líneas de compra.
 * Uso: npm run db:migrate-purchase-line-discount
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
  '20260611_purchase_line_discount_pct.sql',
)

async function main() {
  const sql = readFileSync(sqlPath, 'utf8')
  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const check = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crm_purchase_line_items' AND column_name = 'discount_pct'
      ) AS exists`,
    )
    if (check.rows[0]?.exists) {
      console.log('Columna discount_pct ya existe en crm_purchase_line_items.')
      return
    }
    await pool.query(sql)
    console.log('Migración discount_pct en compras aplicada.')
  } finally {
    await pool.end()
  }
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
