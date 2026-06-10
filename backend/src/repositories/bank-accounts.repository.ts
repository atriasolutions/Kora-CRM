import type { PoolClient } from 'pg'

import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  isValidChileAccountType,
  isValidChileBankCode,
  resolveChileBankName,
} from '../lib/chile-banks.js'
import { mapBankAccount, type BankAccountRow } from '../mappers/bank-account.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../types/bank-account.js'

const SELECT_COLUMNS = `id, tenant_id, account_name, bank_code, bank_name, account_type,
  account_number, email, is_default, sort_order, created_at, updated_at`

function validateBankInput(input: {
  bankCode?: string
  accountType?: string
  accountNumber?: string
  accountName?: string
}): void {
  if (input.bankCode !== undefined && !isValidChileBankCode(input.bankCode)) {
    throw badRequest('Banco no válido.')
  }
  if (input.accountType !== undefined && !isValidChileAccountType(input.accountType)) {
    throw badRequest('Tipo de cuenta no válido.')
  }
  if (input.accountNumber !== undefined && !input.accountNumber.trim()) {
    throw badRequest('El número de cuenta es obligatorio.')
  }
  if (input.accountName !== undefined && !input.accountName.trim()) {
    throw badRequest('El nombre de la cuenta es obligatorio.')
  }
}

async function clearDefaultBankAccounts(client: PoolClient): Promise<void> {
  await client.query(
    `UPDATE crm_organization_bank_accounts SET is_default = false, updated_at = now()
     WHERE is_default = true AND ${tenantWhereParam(1)}`,
    [getTenantIdOrDefault()],
  )
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  const result = await tenantQuery<BankAccountRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_organization_bank_accounts
     WHERE ${tenantWhereParam(1)}
     ORDER BY is_default DESC, sort_order ASC, account_name ASC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapBankAccount)
}

export async function getBankAccountById(id: string): Promise<BankAccount> {
  const result = await tenantQuery<BankAccountRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_organization_bank_accounts
     WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Cuenta bancaria no encontrada')
  return mapBankAccount(row)
}

export async function createBankAccount(input: CreateBankAccountInput): Promise<BankAccount> {
  validateBankInput(input)
  const bankName = resolveChileBankName(input.bankCode)
  if (!bankName) throw badRequest('Banco no válido.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_organization_bank_accounts
       WHERE ${tenantWhereParam(1)}`,
      [getTenantIdOrDefault()],
    )
    const isFirst = Number.parseInt(countResult.rows[0]?.count ?? '0', 10) === 0
    const isDefault = input.isDefault === true || isFirst

    if (isDefault) {
      await clearDefaultBankAccounts(client)
    }

    const result = await client.query<BankAccountRow>(
      `INSERT INTO crm_organization_bank_accounts (
         tenant_id, account_name, bank_code, bank_name, account_type,
         account_number, email, is_default, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${SELECT_COLUMNS}`,
      [
        getTenantIdOrDefault(),
        input.accountName.trim(),
        input.bankCode,
        bankName,
        input.accountType,
        input.accountNumber.trim(),
        input.email?.trim() || '',
        isDefault,
        input.sortOrder ?? 0,
      ],
    )

    await client.query('COMMIT')
    return mapBankAccount(result.rows[0]!)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updateBankAccount(
  id: string,
  input: UpdateBankAccountInput,
): Promise<BankAccount> {
  validateBankInput(input)
  const existing = await getBankAccountById(id)

  const bankCode = input.bankCode ?? existing.bankCode
  const bankName = resolveChileBankName(bankCode)
  if (!bankName) throw badRequest('Banco no válido.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    if (input.isDefault === true) {
      await clearDefaultBankAccounts(client)
    }

    const result = await client.query<BankAccountRow>(
      `UPDATE crm_organization_bank_accounts SET
         account_name = COALESCE($2, account_name),
         bank_code = $3,
         bank_name = $4,
         account_type = COALESCE($5, account_type),
         account_number = COALESCE($6, account_number),
         email = COALESCE($7, email),
         is_default = COALESCE($8, is_default),
         sort_order = COALESCE($9, sort_order),
         updated_at = now()
       WHERE id = $1 AND ${tenantWhereParam(10)}
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.accountName?.trim() || null,
        bankCode,
        bankName,
        input.accountType ?? null,
        input.accountNumber?.trim() || null,
        input.email !== undefined ? input.email.trim() : null,
        input.isDefault ?? null,
        input.sortOrder ?? null,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Cuenta bancaria no encontrada')

    await client.query('COMMIT')
    return mapBankAccount(row)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function deleteBankAccount(id: string): Promise<void> {
  const refs = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_quotes
     WHERE bank_account_id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  if (Number.parseInt(refs.rows[0]?.count ?? '0', 10) > 0) {
    throw badRequest(
      'No se puede eliminar: hay cotizaciones que referencian esta cuenta bancaria.',
    )
  }

  const result = await tenantQuery(
    `DELETE FROM crm_organization_bank_accounts
     WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  if (!result.rowCount) throw notFound('Cuenta bancaria no encontrada')
}
