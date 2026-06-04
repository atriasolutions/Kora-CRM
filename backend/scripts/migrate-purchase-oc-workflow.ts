/**
 * Migra estados de OC: Borrador / Emitida / Confirmada.
 * Uso: npm run db:migrate-purchase-oc-workflow
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
  '20260529_purchase_oc_workflow.sql',
)

async function main() {
  const sql = readFileSync(sqlPath, 'utf8')
  const pool = new pg.Pool({ connectionString: databaseUrl })
  try {
    const check = await pool.query<{ typname: string }>(
      `SELECT typname FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       WHERE t.typname = 'crm_purchase_status' AND e.enumlabel = 'Borrador'
       LIMIT 1`,
    )
    if (check.rows.length > 0) {
      console.log('Migración ya aplicada: crm_purchase_status incluye Borrador.')
      return
    }
    await pool.query(sql)
    console.log('Migración aplicada: crm_purchase_status → Borrador, Emitida, Confirmada')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
