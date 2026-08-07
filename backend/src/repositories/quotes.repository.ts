import { sumLineTotals } from '../lib/line-items.js'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import {
  collectProductIdsFromQuoteItems,
  computeQuoteLinesWithCurrency,
  loadProductPricesByIds,
  type ComputedLineWithCurrency,
} from '../lib/document-line-items.js'
import { getExchangeRatesForDocumentDate } from '../services/exchange-rates.service.js'
import { normalizeProductCurrency } from '../types/currency.js'
import {
  resolveCustomerSnapshots,
  resolveOpportunitySnapshot,
} from '../lib/relation-snapshots.js'
import { withStockTransaction } from '../lib/inventory-stock-lock.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapQuoteDetail,
  mapQuoteRow,
  type QuoteLineRow,
  type QuoteRow,
} from '../mappers/quote.mapper.js'
import { maybeNotifyRecordOwnerChange, maybeNotifyRecordOwnerOnCreate } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateQuoteInput,
  QuoteDetail,
  QuoteListItem,
  QuoteLineItemInput,
  UpdateQuoteInput,
} from '../types/quote.js'
import { parseDateInput } from '../utils/format.js'
import { formatDiscountPct, parseMoneyToCents, parsePercentToInt } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import { broadcastInventoryUpdated } from '../services/notifications.service.js'
import { syncQuoteStockOnStatusChange } from './stock-reservations.repository.js'

const QUOTE_COLUMNS = `
  id, code, title, opportunity_id, opportunity_name, company_id, company_name,
  contact_id, contact_name, amount_cents, status, valid_until, issue_date,
  owner_name, customer_kind,
  payment_terms, delivery_terms, terms, global_discount_pct,
  include_bank_details, bank_account_id,
  exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

function resolveGlobalDiscountPct(input: {
  globalDiscount?: string
}): number {
  return parsePercentToInt(input.globalDiscount) ?? 0
}

function normalizeQuoteTerms(input: {
  paymentTerms?: string
  deliveryTerms?: string
  terms?: string
}): { paymentTerms: string; deliveryTerms: string; terms: string } {
  return {
    paymentTerms: input.paymentTerms?.trim() ?? '',
    deliveryTerms: input.deliveryTerms?.trim() ?? '',
    terms: input.terms?.trim() ?? '',
  }
}

const LINE_COLUMNS = `
  id, quote_id, product_id, product_name, sku, description, quantity,
  unit_price_cents, discount_pct, total_cents, sort_order,
  price_currency, unit_price_original,
  subject_to_vat, deferred_payment, deferred_payment_text
`

export type ListQuotesParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  opportunityId?: string
  companyId?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

async function loadQuoteLineItems(quoteId: string): Promise<QuoteLineRow[]> {
  const result = await tenantQuery<QuoteLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_quote_line_items
     WHERE quote_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [quoteId],
  )
  return result.rows
}

async function nextQuoteCode(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `COT-${year}-`
  const result = await tenantQuery<{ code: string }>(
    `SELECT code FROM crm_quotes
     WHERE code LIKE $1
     ORDER BY code DESC
     LIMIT 1`,
    [`${prefix}%`],
  )
  const last = result.rows[0]?.code
  let seq = 1
  if (last) {
    const part = last.slice(prefix.length)
    const n = Number.parseInt(part, 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

async function insertQuoteLineItems(
  client: import('pg').PoolClient,
  quoteId: string,
  lines: ComputedLineWithCurrency[],
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    await client.query(
      `INSERT INTO crm_quote_line_items (
        quote_id, product_id, product_name, sku, description, quantity,
        unit_price_cents, discount_pct, total_cents, sort_order,
        price_currency, unit_price_original,
        subject_to_vat, deferred_payment, deferred_payment_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        quoteId,
        line.productId ?? null,
        line.productName,
        line.sku ?? '',
        line.description,
        line.quantity,
        line.unitPriceCents,
        line.discountPct,
        line.totalCents,
        i,
        line.priceCurrency,
        line.unitPriceOriginal,
        line.subjectToVat,
        line.deferredPayment,
        line.deferredPaymentText,
      ],
    )
  }
}

function quoteLineRowsToInputs(rows: QuoteLineRow[]): QuoteLineItemInput[] {
  return rows.map((row) => ({
    productId: row.product_id,
    sku: row.sku,
    productName: row.product_name,
    description: row.description ?? row.product_name,
    quantity: Number(row.quantity),
    unitPriceOriginal:
      row.unit_price_original != null ? Number(row.unit_price_original) : undefined,
    priceCurrency: row.price_currency ?? 'CLP',
    discount: formatDiscountPct(row.discount_pct),
    subjectToVat: row.subject_to_vat !== false,
    deferredPayment: row.deferred_payment === true,
    deferredPaymentText: row.deferred_payment_text ?? undefined,
  }))
}

async function prepareQuoteLines(
  items: CreateQuoteInput['lineItems'],
  issueDate: string | null | undefined,
) {
  if (!items?.length) {
    return {
      lines: [] as ComputedLineWithCurrency[],
      exchangeRates: {
        exchangeRateDate: null,
        exchangeRateUf: null,
        exchangeRateUsd: null,
        exchangeRateEur: null,
      },
    }
  }

  const { assertDocumentLineProductsAreSellable } = await import(
    '../lib/assert-sellable-line-products.js'
  )
  await assertDocumentLineProductsAreSellable(items)

  const rates = await getExchangeRatesForDocumentDate(issueDate)
  const productPrices = await loadProductPricesByIds(
    collectProductIdsFromQuoteItems(items),
  )
  const { lines, exchangeRates } = computeQuoteLinesWithCurrency(
    items,
    rates,
    productPrices,
  )
  return { lines, exchangeRates }
}

function resolveAmountCents(
  input: CreateQuoteInput | UpdateQuoteInput,
  lineTotal: number,
): number {
  if (input.amountCents != null) return input.amountCents
  if (input.amount) return parseMoneyToCents(input.amount)
  return lineTotal
}


const QUOTE_SORT_COLUMNS: Record<string, string> = {
  code: 'code',
  number: 'code',
  amount: 'amount_cents',
  status: 'status',
  issueDate: 'issue_date',
  validUntil: 'valid_until',
  companyName: 'company_name',
  owner: 'owner_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export async function listQuotes(
  params: ListQuotesParams,
): Promise<{ items: QuoteListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
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
  if (params.opportunityId) {
    conditions.push(
      `(opportunity_id = $${idx} OR (
        opportunity_id IS NULL AND opportunity_name <> ''
        AND opportunity_name = (SELECT name FROM crm_opportunities WHERE id = $${idx})
      ))`,
    )
    values.push(params.opportunityId)
    idx++
  }
  if (params.companyId) {
    conditions.push(
      `(company_id = $${idx} OR (
        company_id IS NULL AND company_name <> ''
        AND company_name = (SELECT name FROM crm_companies WHERE id = $${idx})
      ) OR opportunity_id IN (
        SELECT id FROM crm_opportunities
        WHERE company_id = $${idx} AND deleted_at IS NULL
      ))`,
    )
    values.push(params.companyId)
    idx++
  }
  if (params.q) {
    conditions.push(
      `(code ILIKE $${idx} OR title ILIKE $${idx} OR company_name ILIKE $${idx} OR opportunity_name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'issue_date',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    QUOTE_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_quotes ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<QuoteRow>(
      `SELECT ${QUOTE_COLUMNS}
       FROM crm_quotes
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapQuoteRow), total }
  })
}

export async function getQuoteById(id: string): Promise<QuoteDetail> {
  const result = await tenantQuery<QuoteRow>(
    `SELECT ${QUOTE_COLUMNS}
     FROM crm_quotes
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Cotización no encontrada')
  return mapQuoteDetail(row, await loadQuoteLineItems(id))
}

export async function createQuote(
  input: CreateQuoteInput,
  actor: AuditActor,
): Promise<QuoteDetail> {
  await enforceRecordQuota(actor)
  if (!input.title?.trim()) throw badRequest('El título es obligatorio')

  const code = input.code?.trim() || (await nextQuoteCode())
  const issueDate =
    parseDateInput(input.issueDate) ?? new Date().toISOString().slice(0, 10)
  const { lines, exchangeRates } = await prepareQuoteLines(input.lineItems, issueDate)
  const lineTotal = sumLineTotals(lines)
  const amountCents = resolveAmountCents(input, lineTotal)
  const commercialTerms = normalizeQuoteTerms(input)
  const globalDiscountPct = resolveGlobalDiscountPct(input)

  const opp = await resolveOpportunitySnapshot(input.opportunityId)
  let customer = await resolveCustomerSnapshots({
    companyId: input.companyId,
    contactId: input.contactId,
  })

  if (input.opportunityId && opp.opportunityId) {
    const oppRow = await tenantQuery<{
      company_id: string | null
      company_name: string
      contact_id: string | null
      contact_name: string
    }>(
      `SELECT company_id, company_name, contact_id, contact_name
       FROM crm_opportunities WHERE id = $1`,
      [opp.opportunityId],
    )
    const o = oppRow.rows[0]
    if (o) {
      if (!customer.companyId && o.company_id) {
        customer = {
          ...customer,
          companyId: o.company_id,
          companyName: o.company_name,
        }
      }
      if (!customer.contactId && o.contact_id) {
        customer = {
          ...customer,
          contactId: o.contact_id,
          contactName: o.contact_name,
        }
      }
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const result = await client.query<QuoteRow>(
      `INSERT INTO crm_quotes (
        code, title, opportunity_id, opportunity_name,
        company_id, company_name, contact_id, contact_name,
        amount_cents, status, valid_until, issue_date,
        owner_name, customer_kind,
        payment_terms, delivery_terms, terms, global_discount_pct,
        include_bank_details, bank_account_id,
        exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14,
        $15, $16, $17, $18,
        $19, $20,
        $21, $22, $23, $24,
        $25, $26, $25, $26, $27
      )
      RETURNING ${QUOTE_COLUMNS}`,
      [
        code,
        input.title.trim(),
        opp.opportunityId,
        opp.opportunityName,
        customer.companyId,
        customer.companyName,
        customer.contactId,
        customer.contactName,
        amountCents,
        input.status ?? 'Borrador',
        parseDateInput(input.validUntil),
        issueDate,
        input.owner?.trim() || actor.userName,
        input.customerKind ?? 'empresa',
        commercialTerms.paymentTerms,
        commercialTerms.deliveryTerms,
        commercialTerms.terms,
        globalDiscountPct,
        input.includeBankDetails === true,
        input.bankAccountId ?? null,
        exchangeRates.exchangeRateUf,
        exchangeRates.exchangeRateUsd,
        exchangeRates.exchangeRateEur,
        exchangeRates.exchangeRateDate,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )

    const row = result.rows[0]!
    await insertQuoteLineItems(client, row.id, lines)
    await client.query('COMMIT')
    const detail = mapQuoteDetail(row, await loadQuoteLineItems(row.id))
    maybeNotifyRecordOwnerOnCreate({
      actor,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'la cotización',
      recordTitle: detail.title || detail.code,
      href: `/cotizaciones/${detail.id}`,
      entityType: 'cotizacion',
      entityId: detail.id,
    })
    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updateQuote(
  id: string,
  input: UpdateQuoteInput,
  actor: AuditActor,
): Promise<QuoteDetail> {
  const existing = await getQuoteById(id)
  const previousOwner = existing.owner ?? ''

  const leavingAccepted =
    existing.status === 'Aceptada' &&
    input.status != null &&
    input.status !== 'Aceptada'

  if (existing.status === 'Aceptada' && input.lineItems !== undefined && !leavingAccepted) {
    throw badRequest(
      'No se pueden modificar las líneas de una cotización aceptada. Cambia el estado antes de editar líneas.',
    )
  }

  let opportunityId = existing.opportunityId || null
  let opportunityName = existing.opportunityName
  if (input.opportunityId !== undefined) {
    const opp = await resolveOpportunitySnapshot(input.opportunityId)
    opportunityId = opp.opportunityId
    opportunityName = opp.opportunityName
  }

  let companyId = existing.companyId ?? null
  let companyName = existing.companyName
  let contactId = existing.contactId ?? null
  let contactName = ''

  if (input.companyId !== undefined || input.contactId !== undefined) {
    const resolved = await resolveCustomerSnapshots({
      companyId: input.companyId ?? companyId,
      contactId: input.contactId ?? contactId,
    })
    companyId = resolved.companyId
    companyName = resolved.companyName
    contactId = resolved.contactId
    contactName = resolved.contactName
  } else {
    const row = await tenantQuery<{ contact_name: string }>(
      `SELECT contact_name FROM crm_quotes WHERE id = $1`,
      [id],
    )
    contactName = row.rows[0]?.contact_name ?? ''
  }

  const linesResult =
    leavingAccepted || input.lineItems === undefined
      ? null
      : await prepareQuoteLines(
          input.lineItems,
          input.issueDate !== undefined
            ? parseDateInput(input.issueDate)
            : existing.issueDate,
        )
  let lines = linesResult?.lines ?? null
  let exchangeRates = linesResult?.exchangeRates ?? null

  if (!lines && input.issueDate !== undefined) {
    const existingLineRows = await loadQuoteLineItems(id)
    const hasForeign = existingLineRows.some(
      (row) => normalizeProductCurrency(row.price_currency) !== 'CLP',
    )
    if (hasForeign && existingLineRows.length > 0) {
      const recalc = await prepareQuoteLines(
        quoteLineRowsToInputs(existingLineRows),
        parseDateInput(input.issueDate),
      )
      lines = recalc.lines
      exchangeRates = recalc.exchangeRates
    }
  }
  const lineTotal = lines ? sumLineTotals(lines) : null
  const amountCents =
    input.amountCents != null
      ? input.amountCents
      : input.amount
        ? parseMoneyToCents(input.amount)
        : lineTotal ?? parseMoneyToCents(existing.amount)

  const globalDiscountPct =
    input.globalDiscount !== undefined
      ? resolveGlobalDiscountPct(input)
      : parsePercentToInt(existing.globalDiscount) ?? 0

  const termsPatch =
    input.paymentTerms !== undefined ||
    input.deliveryTerms !== undefined ||
    input.terms !== undefined
      ? normalizeQuoteTerms({
          paymentTerms: input.paymentTerms ?? existing.paymentTerms,
          deliveryTerms: input.deliveryTerms ?? existing.deliveryTerms,
          terms: input.terms ?? existing.terms,
        })
      : null

  const detail = await withStockTransaction(pool, async (client) => {
    const result = await client.query<QuoteRow>(
      `UPDATE crm_quotes SET
        code = $2,
        title = $3,
        opportunity_id = $4,
        opportunity_name = $5,
        company_id = $6,
        company_name = $7,
        contact_id = $8,
        contact_name = $9,
        amount_cents = $10,
        status = $11,
        valid_until = COALESCE($12, valid_until),
        issue_date = COALESCE($13, issue_date),
        owner_name = $14,
        customer_kind = $15,
        payment_terms = COALESCE($16, payment_terms),
        delivery_terms = COALESCE($17, delivery_terms),
        terms = COALESCE($18, terms),
        global_discount_pct = $19,
        include_bank_details = $20,
        bank_account_id = $21,
        exchange_rate_uf = COALESCE($22, exchange_rate_uf),
        exchange_rate_usd = COALESCE($23, exchange_rate_usd),
        exchange_rate_eur = COALESCE($24, exchange_rate_eur),
        exchange_rate_date = COALESCE($25, exchange_rate_date),
        updated_by_id = $26,
        updated_by_name = $27,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(28)}
      RETURNING ${QUOTE_COLUMNS}`,
      [
        id,
        input.code?.trim() ?? existing.code,
        input.title?.trim() ?? existing.title,
        opportunityId || null,
        opportunityName,
        companyId,
        companyName,
        contactId,
        contactName,
        amountCents,
        input.status ?? existing.status,
        input.validUntil !== undefined ? parseDateInput(input.validUntil) : null,
        input.issueDate !== undefined ? parseDateInput(input.issueDate) : null,
        input.owner?.trim() ?? existing.owner,
        input.customerKind ?? existing.customerKind ?? 'empresa',
        termsPatch?.paymentTerms ?? null,
        termsPatch?.deliveryTerms ?? null,
        termsPatch?.terms ?? null,
        globalDiscountPct,
        input.includeBankDetails !== undefined
          ? input.includeBankDetails
          : existing.includeBankDetails === true,
        input.bankAccountId !== undefined
          ? input.bankAccountId
          : existing.bankAccountId ?? null,
        exchangeRates?.exchangeRateUf ?? null,
        exchangeRates?.exchangeRateUsd ?? null,
        exchangeRates?.exchangeRateEur ?? null,
        exchangeRates?.exchangeRateDate ?? null,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Cotización no encontrada')

    if (lines) {
      await client.query(`DELETE FROM crm_quote_line_items WHERE quote_id = $1`, [
        id,
      ])
      await insertQuoteLineItems(client, id, lines)
    }

    const nextStatus = input.status ?? existing.status
    await syncQuoteStockOnStatusChange(
      client,
      id,
      row.code,
      existing.status,
      nextStatus,
      actor,
    )

    return mapQuoteDetail(row, await loadQuoteLineItems(id))
  })
  broadcastInventoryUpdated(actor.userId)
  if (input.owner !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'la cotización',
      recordTitle: detail.title || detail.code,
      href: `/cotizaciones/${detail.id}`,
      entityType: 'cotizacion',
      entityId: detail.id,
    })
  }
  return detail
}

export async function ensureQuoteStockReservation(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const existing = await getQuoteById(id)
  if (existing.status !== 'Aceptada') {
    throw badRequest('Solo se reserva stock para cotizaciones Aceptadas.')
  }

  await withStockTransaction(pool, async (client) => {
    await syncQuoteStockOnStatusChange(
      client,
      id,
      existing.code,
      existing.status,
      existing.status,
      actor,
    )
  })
  broadcastInventoryUpdated(actor.userId)
}

export async function softDeleteQuote(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_quotes
     SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Cotización no encontrada')
  await purgeEntityNotesAndFiles('cotizacion', id)
}

export async function archiveQuote(
  id: string,
  actor: AuditActor,
): Promise<QuoteDetail> {
  const result = await tenantQuery<QuoteRow>(
    `UPDATE crm_quotes
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${QUOTE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Cotización no encontrada o ya archivada')
  return mapQuoteDetail(row, await loadQuoteLineItems(id))
}

export async function restoreQuote(
  id: string,
  actor: AuditActor,
): Promise<QuoteDetail> {
  const result = await tenantQuery<QuoteRow>(
    `UPDATE crm_quotes
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${QUOTE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Cotización no encontrada')
  return mapQuoteDetail(row, await loadQuoteLineItems(id))
}
