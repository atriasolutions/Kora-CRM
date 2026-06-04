/**
 * Añade columnas de detalle a crm_purchases (logística, contacto proveedor, observaciones).
 * Uso: npm run db:migrate-purchase-detail-fields
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
  '20260601_purchase_detail_fields.sql',
)

async function main() {
  const sql = readFileSync(sqlPath, 'utf8')
  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const check = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'crm_purchases' AND column_name = 'description'
      ) AS exists`,
    )
    if (check.rows[0]?.exists) {
      console.log('Migración ya aplicada: columnas de detalle en crm_purchases.')
      return
    }
    await pool.query(sql)
    console.log('Migración aplicada: detalle de orden de compra en crm_purchases')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
