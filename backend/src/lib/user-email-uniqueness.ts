import { pool } from '../db/pool.js'
import { conflict } from '../middleware/errors.js'

type DuplicateUserRow = { id: string; name: string }

type TenantMembershipRow = DuplicateUserRow & { membership_status: string }

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

/** Usuario con el correo que ya tiene membresía en el tenant indicado. */
export async function findUserWithMembershipInTenant(
  email: string,
  tenantId: string,
): Promise<TenantMembershipRow | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !tenantId) return null

  const result = await pool.query<TenantMembershipRow>(
    `SELECT u.id, u.name, m.status AS membership_status
     FROM crm_users u
     INNER JOIN crm_tenant_memberships m
       ON m.user_id = u.id AND m.tenant_id = $2
     WHERE lower(u.email) = $1
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [normalized, tenantId],
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

/** Valida correo al editar la fila global de crm_users (un email por persona). */
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

/** Impide duplicar el mismo correo dentro de un tenant. */
export async function assertUserEmailNotInTenant(
  email: string,
  tenantId: string,
): Promise<void> {
  const trimmed = email.trim()
  if (!trimmed || !tenantId) return

  const duplicate = await findUserWithMembershipInTenant(trimmed, tenantId)
  if (duplicate) {
    throw conflict(
      `Ya existe un usuario con el correo «${trimmed}» en esta instancia.`,
    )
  }
}
