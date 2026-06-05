import { pool } from '../db/pool.js'
import { conflict } from '../middleware/errors.js'

type DuplicateRow = { id: string; name: string }

export async function assertUniqueContactEmail(
  email: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  const trimmed = email?.trim()
  if (!trimmed) return

  const normalized = trimmed.toLowerCase()
  const result = await pool.query<DuplicateRow>(
    `SELECT id, name
     FROM crm_contacts
     WHERE deleted_at IS NULL
       AND email IS NOT NULL
       AND trim(email) <> ''
       AND lower(trim(email)) = $1
       AND ($2::uuid IS NULL OR id <> $2)
     LIMIT 1`,
    [normalized, excludeId ?? null],
  )
  const duplicate = result.rows[0]
  if (duplicate) {
    throw conflict(`Ya existe un contacto con ese correo: «${duplicate.name}».`)
  }
}
