import { pool } from '../db/pool.js'
import { conflict } from '../middleware/errors.js'

type DuplicateUserRow = { id: string; name: string }

export async function findUserByEmail(
  email: string,
  excludeUserId?: string,
): Promise<DuplicateUserRow | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const result = await pool.query<DuplicateUserRow>(
    `SELECT id, name
     FROM crm_users
     WHERE lower(email) = $1
       AND deleted_at IS NULL
       AND ($2::uuid IS NULL OR id <> $2)
     LIMIT 1`,
    [normalized, excludeUserId ?? null],
  )
  return result.rows[0] ?? null
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  )
}

/** Valida que el correo no esté en uso por otro usuario activo. */
export async function assertUserEmailAvailable(
  email: string,
  excludeUserId?: string,
): Promise<void> {
  const trimmed = email.trim()
  if (!trimmed) return

  const duplicate = await findUserByEmail(trimmed, excludeUserId)
  if (duplicate) {
    throw conflict(
      `Ya existe un usuario con el correo «${trimmed}». El correo debe ser único.`,
    )
  }
}
