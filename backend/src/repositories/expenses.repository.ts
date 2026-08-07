import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapExpenseDetail,
  mapExpenseRow,
  type ExpenseRow,
} from '../mappers/expense.mapper.js'
import {
  maybeNotifyRecordOwnerChange,
  maybeNotifyRecordOwnerOnCreate,
} from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateExpenseInput,
  ExpenseDetail,
  ExpenseListItem,
  ListExpensesParams,
  UpdateExpenseInput,
} from '../types/expense.js'
import { EXPENSE_CATEGORIES } from '../types/expense.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'
import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import { getCompanyLinkById } from './companies.repository.js'

const EXPENSE_COLUMNS = `
  id, number, concept, category, expense_date, amount_cents, currency,
  payment_method, status, supplier_id, supplier_name, notes, receipt_urls,
  is_partner_loan, partner_user_id, partner_name, partner_loan_returned, owner_name,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const EXPENSE_SORT_COLUMNS: Record<string, string> = {
  number: 'number',
  concept: 'concept',
  category: 'category',
  amount: 'amount_cents',
  expenseDate: 'expense_date',
  supplierName: 'supplier_name',
  owner: 'owner_name',
  status: 'status',
  paymentMethod: 'payment_method',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export type { ListExpensesParams } from '../types/expense.js'

async function nextExpenseNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `GAS-${year}-`
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ number: string }>(
    `SELECT number FROM crm_expenses
     WHERE number LIKE $1 AND ${tenantWhereParam(2)}
     ORDER BY number DESC
     LIMIT 1`,
    [`${prefix}%`, tenantId],
  )
  const last = result.rows[0]?.number
  let seq = 1
  if (last) {
    const part = last.slice(prefix.length)
    const n = Number.parseInt(part, 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

function resolveAmountCents(input: CreateExpenseInput | UpdateExpenseInput): number {
  if (input.amountCents != null) return Math.max(0, Math.round(input.amountCents))
  if (input.amountNum != null) return Math.max(0, Math.round(input.amountNum * 100))
  if (input.amount) return Math.max(0, parseMoneyToCents(input.amount))
  return 0
}

function resolveCategory(raw?: string): string {
  const value = raw?.trim() || 'Otros'
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value) ? value : 'Otros'
}

function resolvePartnerLoan(input: {
  isPartnerLoan?: boolean
  partnerUserId?: string | null
  partnerName?: string
  partnerLoanReturned?: boolean
}): {
  isPartnerLoan: boolean
  partnerUserId: string | null
  partnerName: string
  partnerLoanReturned: boolean
} {
  const isPartnerLoan = Boolean(input.isPartnerLoan)
  if (!isPartnerLoan) {
    return {
      isPartnerLoan: false,
      partnerUserId: null,
      partnerName: '',
      partnerLoanReturned: false,
    }
  }
  return {
    isPartnerLoan: true,
    partnerUserId: input.partnerUserId?.trim() || null,
    partnerName: input.partnerName?.trim() || '',
    partnerLoanReturned: Boolean(input.partnerLoanReturned),
  }
}

async function resolveSupplier(input: {
  supplierId?: string | null
  supplierName?: string
}): Promise<{ supplierId: string | null; supplierName: string }> {
  let supplierId = input.supplierId ?? null
  let supplierName = input.supplierName?.trim() || ''
  if (supplierId) {
    const company = await getCompanyLinkById(supplierId)
    if (company) {
      supplierId = company.id
      supplierName = company.name?.trim() || supplierName
    } else {
      supplierId = null
    }
  }
  return { supplierId, supplierName }
}

export async function listExpenses(
  params: ListExpensesParams,
): Promise<{ items: ExpenseListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }

  pushTenantCondition(conditions, values, idx)
  idx = values.length + 1

  if (params.status?.trim()) {
    const statuses = parseCommaSeparatedList(params.status)
    if (statuses.length === 1) {
      conditions.push(`status = $${idx++}`)
      values.push(statuses[0])
    } else if (statuses.length > 1) {
      conditions.push(`status = ANY($${idx++}::text[])`)
      values.push(statuses)
    }
  }

  if (params.category?.trim()) {
    const categories = parseCommaSeparatedList(params.category)
    if (categories.length === 1) {
      conditions.push(`category = $${idx++}`)
      values.push(categories[0])
    } else if (categories.length > 1) {
      conditions.push(`category = ANY($${idx++}::text[])`)
      values.push(categories)
    }
  }

  if (params.paymentMethod?.trim()) {
    const methods = parseCommaSeparatedList(params.paymentMethod)
    if (methods.length === 1) {
      conditions.push(`payment_method = $${idx++}`)
      values.push(methods[0])
    } else if (methods.length > 1) {
      conditions.push(`payment_method = ANY($${idx++}::text[])`)
      values.push(methods)
    }
  }

  if (params.supplierId?.trim()) {
    conditions.push(`supplier_id = $${idx++}`)
    values.push(params.supplierId.trim())
  }

  if (params.ownerName?.trim()) {
    conditions.push(`owner_name = $${idx++}`)
    values.push(params.ownerName.trim())
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'expense_date',
    params.dateFrom,
    params.dateTo,
  )

  if (params.q?.trim()) {
    const pattern = `%${params.q.trim()}%`
    conditions.push(
      `(number ILIKE $${idx} OR concept ILIKE $${idx} OR category ILIKE $${idx} OR supplier_name ILIKE $${idx} OR owner_name ILIKE $${idx})`,
    )
    values.push(pattern)
    idx++
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    EXPENSE_SORT_COLUMNS,
    'updated_at DESC',
  )

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_expenses ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<ExpenseRow>(
      `SELECT ${EXPENSE_COLUMNS}
       FROM crm_expenses
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapExpenseRow), total }
  })
}

async function loadExpenseRow(id: string): Promise<ExpenseRow> {
  const result = await tenantQuery<ExpenseRow>(
    `SELECT ${EXPENSE_COLUMNS}
     FROM crm_expenses
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Gasto no encontrado')
  return row
}

export async function getExpenseById(id: string): Promise<ExpenseDetail> {
  return mapExpenseDetail(await loadExpenseRow(id))
}

export async function createExpense(
  input: CreateExpenseInput,
  actor: AuditActor,
): Promise<ExpenseDetail> {
  await enforceRecordQuota(actor)

  const status = input.status ?? 'Registrado'
  const concept = input.concept?.trim() || ''
  const amountCents = resolveAmountCents(input)
  if (status === 'Registrado') {
    if (!concept) throw badRequest('Indica el concepto del gasto')
    if (amountCents <= 0) throw badRequest('El monto debe ser mayor a cero')
  }

  const supplier = await resolveSupplier(input)
  const partnerLoan = resolvePartnerLoan(input)
  if (partnerLoan.isPartnerLoan && !partnerLoan.partnerUserId && !partnerLoan.partnerName) {
    throw badRequest('Indica el socio a quien se debe devolver el préstamo')
  }
  const number = input.number?.trim() || (await nextExpenseNumber())

  const result = await tenantQuery<ExpenseRow>(
    `INSERT INTO crm_expenses (
      number, concept, category, expense_date, amount_cents, currency,
      payment_method, status, supplier_id, supplier_name, notes, receipt_urls,
      is_partner_loan, partner_user_id, partner_name, partner_loan_returned, owner_name,
      created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $18, $19, $20
    )
    RETURNING ${EXPENSE_COLUMNS}`,
    [
      number,
      concept,
      resolveCategory(input.category),
      parseDateInput(input.expenseDate) ?? new Date().toISOString().slice(0, 10),
      amountCents,
      input.currency?.trim() || 'CLP',
      input.paymentMethod ?? 'Transferencia',
      status,
      supplier.supplierId,
      supplier.supplierName,
      input.notes?.trim() || null,
      JSON.stringify(input.receiptUrls ?? []),
      partnerLoan.isPartnerLoan,
      partnerLoan.partnerUserId,
      partnerLoan.partnerName,
      partnerLoan.partnerLoanReturned,
      input.ownerName?.trim() || actor.userName,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )

  const detail = mapExpenseDetail(result.rows[0]!)
  maybeNotifyRecordOwnerOnCreate({
    actor,
    nextOwner: detail.owner ?? '',
    moduleLabel: 'el gasto',
    recordTitle: detail.number || detail.concept || detail.id,
    href: `/gastos/${detail.id}`,
    entityType: 'gasto',
    entityId: detail.id,
  })
  return detail
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
  actor: AuditActor,
): Promise<ExpenseDetail> {
  const existing = await loadExpenseRow(id)
  const previousOwner = existing.owner_name?.trim() || ''

  const status = input.status ?? existing.status
  const concept =
    input.concept !== undefined ? input.concept.trim() : existing.concept
  const amountCents =
    input.amountCents != null ||
    input.amountNum != null ||
    input.amount != null
      ? resolveAmountCents(input)
      : Number(existing.amount_cents)

  if (status === 'Registrado') {
    if (!concept) throw badRequest('Indica el concepto del gasto')
    if (amountCents <= 0) throw badRequest('El monto debe ser mayor a cero')
  }

  let supplierId = existing.supplier_id
  let supplierName = existing.supplier_name
  if (input.supplierId !== undefined || input.supplierName !== undefined) {
    const supplier = await resolveSupplier({
      supplierId:
        input.supplierId !== undefined ? input.supplierId : existing.supplier_id,
      supplierName:
        input.supplierName !== undefined
          ? input.supplierName
          : existing.supplier_name,
    })
    supplierId = supplier.supplierId
    supplierName = supplier.supplierName
  }

  const partnerLoan = resolvePartnerLoan({
    isPartnerLoan:
      input.isPartnerLoan !== undefined
        ? input.isPartnerLoan
        : Boolean(existing.is_partner_loan),
    partnerUserId:
      input.partnerUserId !== undefined
        ? input.partnerUserId
        : existing.partner_user_id,
    partnerName:
      input.partnerName !== undefined
        ? input.partnerName
        : existing.partner_name ?? '',
    partnerLoanReturned:
      input.partnerLoanReturned !== undefined
        ? input.partnerLoanReturned
        : Boolean(existing.partner_loan_returned),
  })
  if (partnerLoan.isPartnerLoan && !partnerLoan.partnerUserId && !partnerLoan.partnerName) {
    throw badRequest('Indica el socio a quien se debe devolver el préstamo')
  }

  const result = await tenantQuery<ExpenseRow>(
    `UPDATE crm_expenses SET
      number = COALESCE($2, number),
      concept = $3,
      category = $4,
      expense_date = $5,
      amount_cents = $6,
      currency = $7,
      payment_method = $8,
      status = $9,
      supplier_id = $10,
      supplier_name = $11,
      notes = $12,
      receipt_urls = $13,
      is_partner_loan = $14,
      partner_user_id = $15,
      partner_name = $16,
      partner_loan_returned = $17,
      owner_name = $18,
      updated_by_id = $19,
      updated_by_name = $20,
      updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(21)}
     RETURNING ${EXPENSE_COLUMNS}`,
    [
      id,
      input.number?.trim() || null,
      concept,
      input.category !== undefined
        ? resolveCategory(input.category)
        : resolveCategory(existing.category),
      input.expenseDate !== undefined
        ? (parseDateInput(input.expenseDate) ??
          existing.expense_date)
        : existing.expense_date,
      amountCents,
      input.currency?.trim() || existing.currency || 'CLP',
      input.paymentMethod ?? existing.payment_method ?? 'Transferencia',
      status,
      supplierId,
      supplierName,
      input.notes !== undefined
        ? input.notes.trim() || null
        : existing.notes,
      input.receiptUrls !== undefined
        ? JSON.stringify(input.receiptUrls)
        : JSON.stringify(existing.receipt_urls),
      partnerLoan.isPartnerLoan,
      partnerLoan.partnerUserId,
      partnerLoan.partnerName,
      partnerLoan.partnerLoanReturned,
      input.ownerName !== undefined
        ? input.ownerName.trim() || actor.userName
        : existing.owner_name || actor.userName,
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )

  const row = result.rows[0]
  if (!row) throw notFound('Gasto no encontrado')
  const detail = mapExpenseDetail(row)

  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'el gasto',
      recordTitle: detail.number || detail.concept || detail.id,
      href: `/gastos/${detail.id}`,
      entityType: 'gasto',
      entityId: detail.id,
    })
  }

  return detail
}

export async function archiveExpense(
  id: string,
  actor: AuditActor,
): Promise<ExpenseListItem> {
  const result = await tenantQuery<ExpenseRow>(
    `UPDATE crm_expenses
     SET archived_at = now(), archived_by_id = $2,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${EXPENSE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Gasto no encontrado o ya archivado')
  return mapExpenseRow(row)
}

export async function restoreExpense(
  id: string,
  actor: AuditActor,
): Promise<ExpenseListItem> {
  const result = await tenantQuery<ExpenseRow>(
    `UPDATE crm_expenses
     SET archived_at = NULL, archived_by_id = NULL,
         updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${EXPENSE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Gasto no encontrado')
  return mapExpenseRow(row)
}

export async function permanentlyDeleteExpense(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const row = await loadExpenseRow(id)
  if (row.status === 'Registrado') {
    throw badRequest('No se puede eliminar un gasto registrado. Anúlalo primero.')
  }

  await withTenantClient(async (client) => {
    const result = await client.query(
      `UPDATE crm_expenses
       SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
      [id, actor.userId, actor.userName, getTenantIdOrDefault()],
    )
    if (result.rowCount === 0) throw notFound('Gasto no encontrado')
    await purgeEntityNotesAndFiles('gasto', id, client)
  })
}
