import { pool } from '../db/pool.js'
import { conflict } from '../middleware/errors.js'
import { getTenantIdOrDefault } from './tenant-context.js'
import {
  inferStoredTaxIdKind,
  normalizeStoredTaxIdKey,
  SQL_NORMALIZED_DNI,
  SQL_NORMALIZED_RUT,
} from './tax-id.js'

type DuplicateRow = { id: string; name: string }

async function findContactByTaxIdKey(
  kind: 'rut' | 'dni',
  key: string,
  tenantId: string,
  excludeId?: string,
): Promise<DuplicateRow | null> {
  const normalizedExpr = kind === 'rut' ? SQL_NORMALIZED_RUT : SQL_NORMALIZED_DNI
  const result = await pool.query<DuplicateRow>(
    `SELECT id, name
     FROM crm_contacts
     WHERE deleted_at IS NULL
       AND tenant_id = $3
       AND rut IS NOT NULL
       AND trim(rut) <> ''
       AND ${normalizedExpr} = $1
       AND ($2::uuid IS NULL OR id <> $2)
     LIMIT 1`,
    [key, excludeId ?? null, tenantId],
  )
  return result.rows[0] ?? null
}

async function findCompanyByTaxIdKey(
  kind: 'rut' | 'dni',
  key: string,
  tenantId: string,
  excludeId?: string,
): Promise<DuplicateRow | null> {
  const normalizedExpr = kind === 'rut' ? SQL_NORMALIZED_RUT : SQL_NORMALIZED_DNI
  const result = await pool.query<DuplicateRow>(
    `SELECT id, name
     FROM crm_companies
     WHERE deleted_at IS NULL
       AND tenant_id = $3
       AND rut IS NOT NULL
       AND trim(rut) <> ''
       AND ${normalizedExpr} = $1
       AND ($2::uuid IS NULL OR id <> $2)
     LIMIT 1`,
    [key, excludeId ?? null, tenantId],
  )
  return result.rows[0] ?? null
}

export async function assertUniqueContactRut(
  rut: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  const trimmed = rut?.trim()
  if (!trimmed) return

  const kind = inferStoredTaxIdKind(trimmed)
  const key = normalizeStoredTaxIdKey(trimmed, kind)
  if (!key) return

  const tenantId = getTenantIdOrDefault()
  const duplicate = await findContactByTaxIdKey(kind, key, tenantId, excludeId)
  if (duplicate) {
    const label = kind === 'rut' ? 'RUT' : 'DNI'
    throw conflict(`Ya existe un contacto con ese ${label}: «${duplicate.name}».`)
  }
}

export async function assertUniqueCompanyTaxId(
  rut: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  const trimmed = rut?.trim()
  if (!trimmed) return

  const kind = inferStoredTaxIdKind(trimmed)
  const key = normalizeStoredTaxIdKey(trimmed, kind)
  if (!key) return

  const tenantId = getTenantIdOrDefault()
  const duplicate = await findCompanyByTaxIdKey(kind, key, tenantId, excludeId)
  if (duplicate) {
    const label = kind === 'rut' ? 'RUT' : 'DNI'
    throw conflict(`Ya existe una empresa con ese ${label}: «${duplicate.name}».`)
  }
}
