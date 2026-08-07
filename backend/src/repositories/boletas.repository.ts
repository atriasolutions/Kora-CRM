import type { PoolClient } from 'pg'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import { sumLineTotals } from '../lib/line-items.js'
import {
  collectProductIdsFromQuoteItems,
  computeQuoteLinesWithCurrency,
  loadProductPricesByIds,
  type ComputedLineWithCurrency,
} from '../lib/document-line-items.js'
import {
  computeInvoiceDteAmounts,
  dteLineFromComputed,
} from '../lib/invoice-dte-amounts.js'
import { getExchangeRatesForDocumentDate } from '../services/exchange-rates.service.js'
import { withStockTransaction } from '../lib/inventory-stock-lock.js'
import { resolveCustomerSnapshots } from '../lib/relation-snapshots.js'
import { pool } from '../db/pool.js'
import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapBoletaDetail,
  mapBoletaLineRow,
  mapBoletaRow,
  type BoletaLineRow,
  type BoletaRow,
} from '../mappers/boleta.mapper.js'
import { maybeNotifyRecordOwnerChange, maybeNotifyRecordOwnerOnCreate } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import * as orgSettingsRepo from './organization-settings.repository.js'
import type { AuditActor } from '../types/audit.js'
import type {
  BoletaDetail,
  BoletaListItem,
  CreateBoletaInput,
  ListBoletasParams,
  UpdateBoletaInput,
} from '../types/boleta.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents, parsePercentToInt } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  pushInListCondition,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import { broadcastInventoryUpdated } from '../services/notifications.service.js'
import {
  commitStockForBoleta,
  syncBoletaStockOnStatusChange,
} from './stock-reservations.repository.js'

const BOLETA_COLUMNS = `
  id, number, buyer_name, buyer_tax_id, contact_id, contact_name,
  company_id, company_name, amount_cents, issue_date, status,
  owner_name, payment_method, taxable_amount_cents, exempt_amount_cents,
  tax_amount_cents, global_discount_pct, notes, printed_at,
  exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const LINE_COLUMNS = `
  id, boleta_id, product_id, product_name, sku, description, quantity,
  unit_price_cents, discount_pct, total_cents, sort_order,
  price_currency, unit_price_original,
  subject_to_vat, deferred_payment, deferred_payment_text
`

export type { ListBoletasParams } from '../types/boleta.js'

function resolveGlobalDiscountPct(input: { globalDiscount?: string }): number {
  return parsePercentToInt(input.globalDiscount) ?? 0
}

async function nextBoletaNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `BOL-${year}-`
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ number: string }>(
    `SELECT number FROM crm_boletas
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

function resolveAmountCents(
  input: CreateBoletaInput | UpdateBoletaInput,
  lineTotal: number,
): number {
  if (input.amountCents != null) return input.amountCents
  if (input.amountNum != null) return Math.round(input.amountNum * 100)
  if (input.amount) return parseMoneyToCents(input.amount)
  return lineTotal
}

async function computeBoletaAmountsAsync(
  lines: ComputedLineWithCurrency[],
  globalDiscountPct: number,
) {
  const org = await orgSettingsRepo.getOrganizationSettings()
  const dteLines = lines.map((line) =>
    dteLineFromComputed({
      totalCents: line.totalCents,
      subjectToVat: line.subjectToVat,
      description: line.description ?? line.productName,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    }),
  )
  return computeInvoiceDteAmounts(dteLines, globalDiscountPct, org.defaultVatPercent)
}

async function insertBoletaLineItems(
  client: PoolClient,
  boletaId: string,
  lines: ComputedLineWithCurrency[],
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    await client.query(
      `INSERT INTO crm_boleta_line_items (
        boleta_id, product_id, product_name, sku, description, quantity,
        unit_price_cents, discount_pct, total_cents, sort_order,
        price_currency, unit_price_original,
        subject_to_vat, deferred_payment, deferred_payment_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        boletaId,
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

async function prepareBoletaLines(
  items: CreateBoletaInput['lineItems'],
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

  const rates = await getExchangeRatesForDocumentDate(issueDate)
  const { assertDocumentLineProductsAreSellable } = await import(
    '../lib/assert-sellable-line-products.js'
  )
  await assertDocumentLineProductsAreSellable(items)
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

async function loadBoletaLineItems(boletaId: string): Promise<BoletaLineRow[]> {
  const result = await tenantQuery<BoletaLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_boleta_line_items
     WHERE boleta_id = $1
     ORDER BY sort_order ASC`,
    [boletaId],
  )
  return result.rows
}


const BOLETA_SORT_COLUMNS: Record<string, string> = {
  number: 'number',
  amount: 'amount_cents',
  status: 'status',
  issueDate: 'issue_date',
  buyerName: 'buyer_name',
  companyName: 'company_name',
  owner: 'owner_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export async function listBoletas(
  params: ListBoletasParams,
): Promise<{ items: BoletaListItem[]; total: number }> {
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

  idx = pushInListCondition(conditions, values, idx, 'status', params.status)

  idx = pushInListCondition(conditions, values, idx, 'payment_method', params.paymentMethod)

  if (params.companyId?.trim()) {
    conditions.push(`company_id = $${idx++}`)
    values.push(params.companyId.trim())
  }

  if (params.q?.trim()) {
    const pattern = `%${params.q.trim()}%`
    conditions.push(
      `(number ILIKE $${idx} OR buyer_name ILIKE $${idx} OR buyer_tax_id ILIKE $${idx} OR contact_name ILIKE $${idx} OR company_name ILIKE $${idx})`,
    )
    values.push(pattern)
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
    BOLETA_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_boletas ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<BoletaRow>(
      `SELECT ${BOLETA_COLUMNS}
       FROM crm_boletas
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapBoletaRow), total }
  })
}

async function loadBoletaHeaderRow(id: string): Promise<BoletaRow> {
  const result = await tenantQuery<BoletaRow>(
    `SELECT ${BOLETA_COLUMNS}
     FROM crm_boletas
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Boleta no encontrada')
  return row
}

export async function getBoletaById(id: string): Promise<BoletaDetail> {
  const row = await loadBoletaHeaderRow(id)
  const lineRows = await loadBoletaLineItems(id)
  return mapBoletaDetail(row, lineRows.map(mapBoletaLineRow))
}

export async function createBoleta(
  input: CreateBoletaInput,
  actor: AuditActor,
): Promise<BoletaDetail> {
  await enforceRecordQuota(actor)

  const customer = await resolveCustomerSnapshots({
    companyId: input.companyId,
    companyName: input.companyName,
    contactId: input.contactId,
    contactName: input.contactName,
  })

  const linesResult = await prepareBoletaLines(
    input.lineItems,
    parseDateInput(input.issueDate),
  )
  const lines = linesResult.lines
  const status = input.status ?? 'Borrador'
  if (status === 'Emitida' && lines.length === 0) {
    throw badRequest('Agrega al menos una línea para emitir la boleta')
  }

  const globalDiscountPct = resolveGlobalDiscountPct(input)
  const amounts = await computeBoletaAmountsAsync(lines, globalDiscountPct)
  const lineTotal = sumLineTotals(lines)
  const amountCents = resolveAmountCents(input, amounts.totalCents || lineTotal)
  const number = input.number?.trim() || (await nextBoletaNumber())
  const buyerName =
    input.buyerName?.trim() ||
    customer.contactName?.trim() ||
    customer.companyName?.trim() ||
    ''
  const buyerTaxId = input.buyerTaxId?.trim() || ''
  const exchangeRates = linesResult.exchangeRates

  let inventoryChanged = false
  const detail = await withStockTransaction(pool, async (client) => {
    const result = await client.query<BoletaRow>(
      `INSERT INTO crm_boletas (
        number, buyer_name, buyer_tax_id, contact_id, contact_name,
        company_id, company_name, amount_cents, issue_date, status,
        owner_name, payment_method, global_discount_pct,
        taxable_amount_cents, exempt_amount_cents, tax_amount_cents,
        notes,
        exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16,
        $17,
        $18, $19, $20, $21,
        $22, $23, $22, $23, $24
      )
      RETURNING ${BOLETA_COLUMNS}`,
      [
        number,
        buyerName,
        buyerTaxId,
        customer.contactId,
        customer.contactName,
        customer.companyId,
        customer.companyName,
        amountCents,
        parseDateInput(input.issueDate) ?? new Date().toISOString().slice(0, 10),
        status,
        input.ownerName?.trim() || actor.userName,
        input.paymentMethod ?? 'Efectivo',
        globalDiscountPct,
        amounts.taxableCents,
        amounts.exemptCents,
        amounts.taxCents,
        input.notes?.trim() || null,
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
    if (lines.length > 0) await insertBoletaLineItems(client, row.id, lines)

    if (status === 'Emitida') {
      inventoryChanged = await syncBoletaStockOnStatusChange(
        client,
        row.id,
        number,
        'Borrador',
        status,
        actor,
      )
    }

    const lineRows = await loadBoletaLineItems(row.id)
    return mapBoletaDetail(row, lineRows.map(mapBoletaLineRow))
  })

  if (inventoryChanged) {
    broadcastInventoryUpdated(actor.userId)
  }
  maybeNotifyRecordOwnerOnCreate({
    actor,
    nextOwner: detail.owner ?? '',
    moduleLabel: 'la boleta',
    recordTitle: detail.number || detail.id,
    href: `/boletas/${detail.id}`,
    entityType: 'boleta',
    entityId: detail.id,
  })
  return detail
}

export async function updateBoleta(
  id: string,
  input: UpdateBoletaInput,
  actor: AuditActor,
): Promise<BoletaDetail> {
  const existingRow = await loadBoletaHeaderRow(id)
  const existing = mapBoletaRow(existingRow)
  const previousStatus = existing.status
  const previousOwner = existing.owner ?? ''

  let lines: ComputedLineWithCurrency[] | undefined
  let exchangeRates = {
    exchangeRateDate: existingRow.exchange_rate_date,
    exchangeRateUf: existingRow.exchange_rate_uf,
    exchangeRateUsd: existingRow.exchange_rate_usd,
    exchangeRateEur: existingRow.exchange_rate_eur,
  }

  if (input.lineItems !== undefined) {
    const linesResult = await prepareBoletaLines(
      input.lineItems,
      parseDateInput(input.issueDate) ?? existing.issueDate,
    )
    lines = linesResult.lines
    exchangeRates = linesResult.exchangeRates
  }

  const nextStatus = input.status ?? previousStatus
  if (nextStatus === 'Emitida') {
    const effectiveLines =
      lines ??
      (await prepareBoletaLines(
        undefined,
        parseDateInput(input.issueDate) ?? existing.issueDate,
      )).lines
    if (input.lineItems === undefined) {
      const existingLines = await loadBoletaLineItems(id)
      if (existingLines.length === 0) {
        throw badRequest('Agrega al menos una línea para emitir la boleta')
      }
    } else if (effectiveLines.length === 0) {
      throw badRequest('Agrega al menos una línea para emitir la boleta')
    }
  }

  const customer = await resolveCustomerSnapshots({
    companyId: input.companyId ?? existingRow.company_id,
    companyName: input.companyName ?? existingRow.company_name,
    contactId: input.contactId ?? existingRow.contact_id,
    contactName: input.contactName ?? existingRow.contact_name,
  })

  const globalDiscountPct =
    input.globalDiscount !== undefined
      ? resolveGlobalDiscountPct(input)
      : Number(existingRow.global_discount_pct ?? 0)

  let amountCents = Number(existingRow.amount_cents)
  let taxableCents = Number(existingRow.taxable_amount_cents ?? 0)
  let exemptCents = Number(existingRow.exempt_amount_cents ?? 0)
  let taxCents = Number(existingRow.tax_amount_cents ?? 0)

  if (lines) {
    const amounts = await computeBoletaAmountsAsync(lines, globalDiscountPct)
    amountCents = resolveAmountCents(input, amounts.totalCents)
    taxableCents = amounts.taxableCents
    exemptCents = amounts.exemptCents
    taxCents = amounts.taxCents
  } else if (input.amount !== undefined || input.amountCents !== undefined || input.amountNum !== undefined) {
    amountCents = resolveAmountCents(input, amountCents)
  }

  const buyerName =
    input.buyerName !== undefined
      ? input.buyerName.trim()
      : existingRow.buyer_name
  const buyerTaxId =
    input.buyerTaxId !== undefined
      ? input.buyerTaxId.trim()
      : (existingRow.buyer_tax_id ?? '')

  let inventoryChanged = false
  const detail = await withStockTransaction(pool, async (dbClient) => {
    const result = await dbClient.query<BoletaRow>(
      `UPDATE crm_boletas SET
        buyer_name = COALESCE($2, buyer_name),
        buyer_tax_id = COALESCE($3, buyer_tax_id),
        contact_id = $4,
        contact_name = $5,
        company_id = $6,
        company_name = $7,
        amount_cents = $8,
        issue_date = COALESCE($9, issue_date),
        status = COALESCE($10, status),
        owner_name = COALESCE($11, owner_name),
        payment_method = COALESCE($12, payment_method),
        global_discount_pct = $13,
        taxable_amount_cents = $14,
        exempt_amount_cents = $15,
        tax_amount_cents = $16,
        notes = COALESCE($17, notes),
        exchange_rate_uf = COALESCE($18, exchange_rate_uf),
        exchange_rate_usd = COALESCE($19, exchange_rate_usd),
        exchange_rate_eur = COALESCE($20, exchange_rate_eur),
        exchange_rate_date = COALESCE($21, exchange_rate_date),
        updated_by_id = $22,
        updated_by_name = $23,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(24)}
      RETURNING ${BOLETA_COLUMNS}`,
      [
        id,
        buyerName,
        buyerTaxId,
        customer.contactId,
        customer.contactName,
        customer.companyId,
        customer.companyName,
        amountCents,
        parseDateInput(input.issueDate),
        input.status ?? null,
        input.ownerName?.trim() || null,
        input.paymentMethod ?? null,
        globalDiscountPct,
        taxableCents,
        exemptCents,
        taxCents,
        input.notes !== undefined ? input.notes.trim() || null : null,
        exchangeRates.exchangeRateUf ?? null,
        exchangeRates.exchangeRateUsd ?? null,
        exchangeRates.exchangeRateEur ?? null,
        exchangeRates.exchangeRateDate ?? null,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Boleta no encontrada')

    if (lines) {
      await dbClient.query(`DELETE FROM crm_boleta_line_items WHERE boleta_id = $1`, [id])
      if (lines.length > 0) await insertBoletaLineItems(dbClient, id, lines)
    }

    const changed = await syncBoletaStockOnStatusChange(
      dbClient,
      id,
      row.number,
      previousStatus,
      row.status,
      actor,
    )

    if (row.status === 'Emitida' && previousStatus === row.status) {
      inventoryChanged =
        (await commitStockForBoleta(dbClient, id, row.number, actor)) || changed
    } else {
      inventoryChanged = changed
    }

    const lineRows = await loadBoletaLineItems(id)
    return mapBoletaDetail(row, lineRows.map(mapBoletaLineRow))
  })

  if (inventoryChanged) {
    broadcastInventoryUpdated(actor.userId)
  }

  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'la boleta',
      recordTitle: detail.number || detail.id,
      href: `/boletas/${detail.id}`,
      entityType: 'boleta',
      entityId: detail.id,
    })
  }

  return detail
}

export async function archiveBoleta(
  id: string,
  actor: AuditActor,
): Promise<BoletaListItem> {
  const result = await tenantQuery<BoletaRow>(
    `UPDATE crm_boletas
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${BOLETA_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Boleta no encontrada o ya archivada')
  return mapBoletaRow(row)
}

export async function restoreBoleta(
  id: string,
  actor: AuditActor,
): Promise<BoletaListItem> {
  const result = await tenantQuery<BoletaRow>(
    `UPDATE crm_boletas
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${BOLETA_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Boleta no encontrada')
  return mapBoletaRow(row)
}

export async function markBoletaPrinted(
  id: string,
  actor: AuditActor,
): Promise<BoletaListItem> {
  const result = await tenantQuery<BoletaRow>(
    `UPDATE crm_boletas
     SET printed_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${BOLETA_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Boleta no encontrada')
  return mapBoletaRow(row)
}

export async function permanentlyDeleteBoleta(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const row = await loadBoletaHeaderRow(id)
  if (row.status === 'Emitida') {
    throw badRequest('No se puede eliminar una boleta emitida. Anúlala primero.')
  }

  await withStockTransaction(pool, async (client) => {
    await client.query(
      `UPDATE crm_boletas
       SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
      [id, actor.userId, actor.userName, getTenantIdOrDefault()],
    )
    await client.query(`DELETE FROM crm_boleta_line_items WHERE boleta_id = $1`, [id])
    await purgeEntityNotesAndFiles('boleta', id, client)
  })
}
