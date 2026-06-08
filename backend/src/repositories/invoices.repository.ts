import type { PoolClient } from 'pg'

import { sumLineTotals } from '../lib/line-items.js'
import {
  collectProductIdsFromQuoteItems,
  computeQuoteLinesWithCurrency,
  loadProductPricesByIds,
  loadQuoteExchangeRates,
  type ComputedLineWithCurrency,
} from '../lib/document-line-items.js'
import { getExchangeRatesForDocumentDate } from '../services/exchange-rates.service.js'
import { withStockTransaction } from '../lib/inventory-stock-lock.js'
import { resolveCustomerSnapshots } from '../lib/relation-snapshots.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapInvoiceDetail,
  mapInvoiceRow,
  type InvoiceLineRow,
  type InvoicePaymentRow,
  type InvoiceRow,
} from '../mappers/invoice.mapper.js'
import { maybeNotifyRecordOwnerChange } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import * as orgSettingsRepo from './organization-settings.repository.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateInvoiceInput,
  InvoiceDetail,
  InvoiceListItem,
  UpdateInvoiceInput,
} from '../types/invoice.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'
import { broadcastInventoryUpdated } from '../services/notifications.service.js'
import {
  commitStockForInvoice,
  revertStockForInvoice,
  syncInvoiceStockOnStatusChange,
  transferQuoteReservationsToInvoice,
} from './stock-reservations.repository.js'

const INVOICE_COLUMNS = `
  id, number, client_name, customer_kind, contact_id, contact_name,
  company_id, company_name, quote_id, quote_code, amount_cents,
  issue_date, due_date, status, owner_name, payment_method, sii_number,
  dte_type, sii_track_id, dte_status, dte_xml, sii_emitted_at,
  exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const LINE_COLUMNS = `
  id, invoice_id, product_id, product_name, sku, description, quantity,
  unit_price_cents, discount_pct, total_cents, sort_order,
  price_currency, unit_price_original
`

const PAYMENT_COLUMNS = `
  id, invoice_id, amount_cents, paid_at, method, status, reference
`

export type ListInvoicesParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  quoteId?: string
  companyId?: string
  archivedOnly?: boolean
}

async function loadInvoiceLineItems(invoiceId: string): Promise<InvoiceLineRow[]> {
  const result = await tenantQuery<InvoiceLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_invoice_line_items
     WHERE invoice_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [invoiceId],
  )
  return result.rows
}

async function loadInvoicePayments(invoiceId: string): Promise<InvoicePaymentRow[]> {
  const result = await tenantQuery<InvoicePaymentRow>(
    `SELECT ${PAYMENT_COLUMNS}
     FROM crm_invoice_payments
     WHERE invoice_id = $1
     ORDER BY paid_at ASC, id ASC`,
    [invoiceId],
  )
  return result.rows
}

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `FAC-${year}-`
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<{ number: string }>(
    `SELECT number FROM crm_invoices
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

async function resolveQuoteSnapshot(
  quoteId?: string | null,
): Promise<{ quoteId: string | null; quoteCode: string }> {
  if (!quoteId?.trim()) return { quoteId: null, quoteCode: '' }
  const result = await tenantQuery<{ id: string; code: string }>(
    `SELECT id, code FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [quoteId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Cotización no encontrada')
  return { quoteId: row.id, quoteCode: row.code }
}

function clientNameFromCustomer(
  customerKind: string,
  companyName: string,
  contactName: string,
): string {
  if (customerKind === 'contacto') {
    return contactName.trim() || 'Contacto sin nombre'
  }
  return companyName.trim() || 'Empresa sin nombre'
}

function resolveAmountCents(
  input: CreateInvoiceInput | UpdateInvoiceInput,
  lineTotal: number,
): number {
  if (input.amountCents != null) return input.amountCents
  if (input.amountNum != null) return Math.round(input.amountNum * 100)
  if (input.amount) return parseMoneyToCents(input.amount)
  return lineTotal
}

async function insertInvoiceLineItems(
  client: PoolClient,
  invoiceId: string,
  lines: ComputedLineWithCurrency[],
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    await client.query(
      `INSERT INTO crm_invoice_line_items (
        invoice_id, product_id, product_name, sku, description, quantity,
        unit_price_cents, discount_pct, total_cents, sort_order,
        price_currency, unit_price_original
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        invoiceId,
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
      ],
    )
  }
}

async function prepareInvoiceLines(
  items: CreateInvoiceInput['lineItems'],
  issueDate: string | null | undefined,
  quoteId?: string | null,
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

  const quoteRates = quoteId?.trim()
    ? await loadQuoteExchangeRates(quoteId.trim())
    : null
  const rates =
    quoteRates ?? (await getExchangeRatesForDocumentDate(issueDate))
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

async function loadCustomerFromQuote(quoteId: string): Promise<{
  companyId: string | null
  companyName: string
  contactId: string | null
  contactName: string
  customerKind: string
}> {
  const result = await tenantQuery<{
    company_id: string | null
    company_name: string
    contact_id: string | null
    contact_name: string
    customer_kind: string | null
  }>(
    `SELECT company_id, company_name, contact_id, contact_name, customer_kind
     FROM crm_quotes WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [quoteId, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('Cotización no encontrada')
  return {
    companyId: row.company_id,
    companyName: row.company_name,
    contactId: row.contact_id,
    contactName: row.contact_name,
    customerKind: row.customer_kind ?? 'empresa',
  }
}

export async function listInvoices(
  params: ListInvoicesParams,
): Promise<{ items: InvoiceListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
  if (params.status) {
    conditions.push(`status = $${idx++}`)
    values.push(params.status)
  }
  if (params.quoteId) {
    conditions.push(`quote_id = $${idx++}`)
    values.push(params.quoteId)
  }
  if (params.companyId) {
    conditions.push(
      `(company_id = $${idx} OR (
        company_id IS NULL AND company_name <> ''
        AND company_name = (SELECT name FROM crm_companies WHERE id = $${idx})
      ))`,
    )
    values.push(params.companyId)
    idx++
  }
  if (params.q) {
    conditions.push(
      `(number ILIKE $${idx} OR client_name ILIKE $${idx} OR company_name ILIKE $${idx} OR contact_name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_invoices ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await tenantQuery<InvoiceRow>(
    `SELECT ${INVOICE_COLUMNS}
     FROM crm_invoices
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return { items: result.rows.map(mapInvoiceRow), total }
}

async function loadInvoiceHeaderRow(id: string): Promise<InvoiceRow> {
  const result = await tenantQuery<InvoiceRow>(
    `SELECT ${INVOICE_COLUMNS}
     FROM crm_invoices
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Factura no encontrada')
  return row
}

export async function getInvoiceById(id: string): Promise<InvoiceDetail> {
  const row = await loadInvoiceHeaderRow(id)
  return mapInvoiceDetail(
    row,
    await loadInvoiceLineItems(id),
    await loadInvoicePayments(id),
  )
}

export async function createInvoice(
  input: CreateInvoiceInput,
  actor: AuditActor,
): Promise<InvoiceDetail> {
  if (!input.dueDate?.trim()) throw badRequest('La fecha de vencimiento es obligatoria')

  const quote = await resolveQuoteSnapshot(input.quoteId)
  let customerKind = input.customerKind ?? 'empresa'
  let customer = await resolveCustomerSnapshots({
    companyId: input.companyId,
    companyName: input.companyName,
    contactId: input.contactId,
    contactName: input.contactName,
  })

  if (quote.quoteId) {
    const fromQuote = await loadCustomerFromQuote(quote.quoteId)
    customerKind = fromQuote.customerKind
    customer = {
      companyId: fromQuote.companyId,
      companyName: fromQuote.companyName,
      contactId: fromQuote.contactId,
      contactName: fromQuote.contactName,
    }
  } else if (!customer.companyId && !customer.contactId) {
    throw badRequest('Selecciona un cliente (empresa o contacto)')
  }

  const linesResult = await prepareInvoiceLines(
    input.lineItems,
    parseDateInput(input.issueDate),
    quote.quoteId,
  )
  const lines = linesResult.lines
  if (lines.length === 0) throw badRequest('Agrega al menos una línea de factura')
  const exchangeRates = linesResult.exchangeRates
  const lineTotal = sumLineTotals(lines)
  const amountCents = resolveAmountCents(input, lineTotal)
  const number = input.number?.trim() || (await nextInvoiceNumber())
  const clientName = clientNameFromCustomer(
    customerKind,
    customer.companyName,
    customer.contactName,
  )

  let inventoryChanged = false
  const detail = await withStockTransaction(pool, async (client) => {
    const result = await client.query<InvoiceRow>(
      `INSERT INTO crm_invoices (
        number, client_name, customer_kind, contact_id, contact_name,
        company_id, company_name, quote_id, quote_code, amount_cents,
        issue_date, due_date, status, owner_name, payment_method, sii_number,
        exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $21, $22, $23
      )
      RETURNING ${INVOICE_COLUMNS}`,
      [
        number,
        clientName,
        customerKind,
        customer.contactId,
        customer.contactName,
        customer.companyId,
        customer.companyName,
        quote.quoteId,
        quote.quoteCode,
        amountCents,
        parseDateInput(input.issueDate) ?? new Date().toISOString().slice(0, 10),
        parseDateInput(input.dueDate),
        input.status ?? 'Borrador',
        input.ownerName?.trim() || actor.userName,
        input.paymentMethod ?? 'Transferencia',
        input.siiNumber?.trim() || null,
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
    await insertInvoiceLineItems(client, row.id, lines)
    if (quote.quoteId) {
      await transferQuoteReservationsToInvoice(client, quote.quoteId, row.id, number)
    }
    const initialStatus = input.status ?? 'Borrador'
    if (initialStatus !== 'Borrador' && initialStatus !== 'Anulada') {
      inventoryChanged = await syncInvoiceStockOnStatusChange(
        client,
        row.id,
        number,
        'Borrador',
        initialStatus,
        actor,
      )
    }
    const [lineRows, paymentRows] = await Promise.all([
      loadInvoiceLineItems(row.id),
      loadInvoicePayments(row.id),
    ])
    return mapInvoiceDetail(row, lineRows, paymentRows)
  })
  if (inventoryChanged) {
    broadcastInventoryUpdated(actor.userId)
  }
  return detail
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
  actor: AuditActor,
  options?: { allowManualSiiNumber?: boolean },
): Promise<InvoiceDetail> {
  const existingRow = await loadInvoiceHeaderRow(id)
  const existing = mapInvoiceRow(existingRow)
  const previousStatus = existing.status
  const previousOwner = existing.owner ?? ''

  if (
    input.siiNumber !== undefined &&
    !options?.allowManualSiiNumber
  ) {
    const org = await orgSettingsRepo.getOrganizationSettings()
    if (org.invoicingMode === 'sii') {
      throw badRequest(
        'En modo SII integrado el folio se asigna al emitir al SII. Usa «Emitir al SII».',
      )
    }
  }

  let quoteId = existingRow.quote_id ?? null
  let quoteCode = existingRow.quote_code ?? ''
  if (input.quoteId !== undefined) {
    const quote = await resolveQuoteSnapshot(input.quoteId)
    quoteId = quote.quoteId
    quoteCode = quote.quoteCode
  }

  let customerKind = existing.customerKind ?? 'empresa'
  let companyId = existing.companyId ?? null
  let companyName = existing.companyName ?? ''
  let contactId = existing.contactId ?? null
  let contactName = existing.contactName ?? ''

  if (input.quoteId !== undefined && quoteId) {
    const fromQuote = await loadCustomerFromQuote(quoteId)
    customerKind = fromQuote.customerKind
    companyId = fromQuote.companyId
    companyName = fromQuote.companyName
    contactId = fromQuote.contactId
    contactName = fromQuote.contactName
  } else if (
    input.companyId !== undefined ||
    input.contactId !== undefined ||
    input.companyName !== undefined ||
    input.contactName !== undefined
  ) {
    const resolved = await resolveCustomerSnapshots({
      companyId: input.companyId ?? companyId,
      companyName: input.companyName ?? companyName,
      contactId: input.contactId ?? contactId,
      contactName: input.contactName ?? contactName,
    })
    companyId = resolved.companyId
    companyName = resolved.companyName
    contactId = resolved.contactId
    contactName = resolved.contactName
  }

  if (input.customerKind !== undefined) customerKind = input.customerKind

  const linesResult =
    input.lineItems !== undefined
      ? await prepareInvoiceLines(
          input.lineItems,
          input.issueDate !== undefined
            ? parseDateInput(input.issueDate)
            : existing.issueDate,
          quoteId,
        )
      : null
  const lines = linesResult?.lines ?? null
  const exchangeRates = linesResult?.exchangeRates
  const lineTotal = lines ? sumLineTotals(lines) : null
  const amountCents = resolveAmountCents(
    input,
    lineTotal ?? parseMoneyToCents(existing.amount),
  )

  const clientName = clientNameFromCustomer(customerKind, companyName, contactName)

  let inventoryChanged = false
  const detail = await withStockTransaction(pool, async (dbClient) => {
    const result = await dbClient.query<InvoiceRow>(
      `UPDATE crm_invoices SET
        client_name = $2,
        customer_kind = $3,
        contact_id = $4,
        contact_name = $5,
        company_id = $6,
        company_name = $7,
        quote_id = $8,
        quote_code = $9,
        amount_cents = $10,
        issue_date = COALESCE($11, issue_date),
        due_date = COALESCE($12, due_date),
        status = COALESCE($13, status),
        owner_name = COALESCE($14, owner_name),
        payment_method = COALESCE($15, payment_method),
        sii_number = COALESCE($16, sii_number),
        exchange_rate_uf = COALESCE($17, exchange_rate_uf),
        exchange_rate_usd = COALESCE($18, exchange_rate_usd),
        exchange_rate_eur = COALESCE($19, exchange_rate_eur),
        exchange_rate_date = COALESCE($20, exchange_rate_date),
        updated_by_id = $21,
        updated_by_name = $22,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(23)}
      RETURNING ${INVOICE_COLUMNS}`,
      [
        id,
        clientName,
        customerKind,
        contactId,
        contactName,
        companyId,
        companyName,
        quoteId,
        quoteCode,
        amountCents,
        parseDateInput(input.issueDate),
        parseDateInput(input.dueDate),
        input.status ?? null,
        input.ownerName?.trim() || null,
        input.paymentMethod ?? null,
        input.siiNumber !== undefined ? input.siiNumber?.trim() || null : null,
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
    if (!row) throw notFound('Factura no encontrada')

    if (lines) {
      await dbClient.query(`DELETE FROM crm_invoice_line_items WHERE invoice_id = $1`, [
        id,
      ])
      if (lines.length > 0) await insertInvoiceLineItems(dbClient, id, lines)
    }

    let changed = await syncInvoiceStockOnStatusChange(
      dbClient,
      id,
      row.number,
      previousStatus,
      row.status,
      actor,
    )

    // Repara facturas emitidas/pagadas con stock o reserva inconsistente.
    if (
      (row.status === 'Pendiente' || row.status === 'Pagada') &&
      previousStatus === row.status
    ) {
      changed =
        (await commitStockForInvoice(dbClient, id, row.number, actor)) || changed
    }

    inventoryChanged = changed

    const [lineRows, paymentRows] = await Promise.all([
      loadInvoiceLineItems(id),
      loadInvoicePayments(id),
    ])
    return mapInvoiceDetail(row, lineRows, paymentRows)
  })

  if (inventoryChanged) {
    broadcastInventoryUpdated(actor.userId)
  }

  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'la factura',
      recordTitle: detail.number || detail.id,
      href: `/facturacion/${detail.id}`,
      entityType: 'factura',
      entityId: detail.id,
    })
  }

  return detail
}

export async function archiveInvoice(
  id: string,
  actor: AuditActor,
): Promise<InvoiceListItem> {
  const result = await tenantQuery<InvoiceRow>(
    `UPDATE crm_invoices
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${INVOICE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Factura no encontrada o ya archivada')
  return mapInvoiceRow(row)
}

export async function restoreInvoice(
  id: string,
  actor: AuditActor,
): Promise<InvoiceListItem> {
  const result = await tenantQuery<InvoiceRow>(
    `UPDATE crm_invoices
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${INVOICE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Factura no encontrada')
  return mapInvoiceRow(row)
}

/** Elimina definitivamente una factura archivada y sus datos relacionados. */
export async function permanentlyDeleteInvoice(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const inv = await client.query<{ number: string }>(
      `SELECT number
       FROM crm_invoices
       WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NOT NULL
       FOR UPDATE`,
      [id],
    )
    const number = inv.rows[0]?.number
    if (!number) {
      throw notFound('Factura no encontrada en archivados')
    }

    await revertStockForInvoice(client, id, number, actor)

    await client.query(`DELETE FROM crm_invoice_line_items WHERE invoice_id = $1`, [
      id,
    ])
    await client.query(`DELETE FROM crm_invoice_payments WHERE invoice_id = $1`, [
      id,
    ])
    await client.query(`DELETE FROM crm_stock_reservations WHERE invoice_id = $1`, [
      id,
    ])
    await client.query(
      `DELETE FROM crm_stock_movements
       WHERE source_kind = 'factura' AND source_id = $1`,
      [id],
    )
    await purgeEntityNotesAndFiles('factura', id, client)
    await client.query(`DELETE FROM crm_invoices WHERE id = $1`, [id])

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
