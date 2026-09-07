import type { PoolClient } from 'pg'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'

import { sumLineTotals } from '../lib/line-items.js'
import {
  collectProductIdsFromPurchaseItems,
  computePurchaseLinesWithCurrency,
  loadProductPricesByIds,
  type ComputedPurchaseLineWithCurrency,
} from '../lib/document-line-items.js'
import { getExchangeRatesForDocumentDate } from '../services/exchange-rates.service.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapPurchaseDetail,
  mapPurchaseRow,
  type PurchaseLineRow,
  type PurchaseRow,
} from '../mappers/purchase.mapper.js'
import { maybeNotifyRecordOwnerChange, maybeNotifyRecordOwnerOnCreate } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreatePurchaseInput,
  PurchaseDetail,
  PurchaseListItem,
  UpdatePurchaseInput,
} from '../types/purchase.js'
import { parseDateInput } from '../utils/format.js'
import { parseMoneyToCents } from '../utils/money.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  pushInListCondition,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'

const PURCHASE_COLUMNS = `
  id, reference, supplier_id, supplier_name, product_summary, order_date,
  amount_cents, status, payment_status, paid_at,
  description, expected_delivery, payment_terms,
  warehouse_id, warehouse_name, delivery_address,
  supplier_contact_id, supplier_contact_name, supplier_email, supplier_phone,
  owner_name,
  exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

function detailInsertParams(input: CreatePurchaseInput | UpdatePurchaseInput) {
  return {
    description: input.description?.trim() ?? '',
    expectedDelivery: parseDateInput(input.expectedDelivery),
    paymentTerms: input.paymentTerms?.trim() ?? '',
    warehouseId: input.warehouseId?.trim() || null,
    warehouseName: input.warehouse?.trim() ?? '',
    deliveryAddress: input.deliveryAddress?.trim() ?? '',
    supplierContactId: input.supplierContactId?.trim() || null,
    supplierContact: input.supplierContact?.trim() ?? '',
    supplierEmail: input.supplierEmail?.trim() ?? '',
    supplierPhone: input.supplierPhone?.trim() ?? '',
  }
}

const LINE_COLUMNS = `
  id, purchase_id, product_id, product_name, sku, description,
  quantity, quantity_received, unit_price_cents, discount_pct, total_cents, sort_order,
  price_currency, unit_price_original
`

export type ListPurchasesParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  archivedOnly?: boolean
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

async function loadPurchaseLines(purchaseId: string): Promise<PurchaseLineRow[]> {
  const result = await tenantQuery<PurchaseLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_purchase_line_items
     WHERE purchase_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [purchaseId],
  )
  return result.rows
}

async function resolveSupplier(
  supplierId?: string,
  supplierName?: string,
): Promise<{ supplierId: string | null; supplierName: string }> {
  if (supplierId?.trim()) {
    const row = await tenantQuery<{ id: string; name: string }>(
      `SELECT id, name FROM crm_companies WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
      [supplierId, getTenantIdOrDefault()],
    )
    if (row.rows[0]) {
      return { supplierId: row.rows[0].id, supplierName: row.rows[0].name }
    }
  }
  const name = supplierName?.trim() || ''
  if (!name) return { supplierId: null, supplierName: '' }
  const byName = await tenantQuery<{ id: string; name: string }>(
    `SELECT id, name FROM crm_companies
     WHERE deleted_at IS NULL AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [name],
  )
  if (byName.rows[0]) {
    return { supplierId: byName.rows[0].id, supplierName: byName.rows[0].name }
  }
  return { supplierId: null, supplierName: name }
}

async function nextPurchaseReference(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `OC-${year}-`
  const result = await tenantQuery<{ reference: string }>(
    `SELECT reference FROM crm_purchases
     WHERE reference LIKE $1
     ORDER BY reference DESC
     LIMIT 1`,
    [`${prefix}%`],
  )
  const last = result.rows[0]?.reference
  let seq = 1
  if (last) {
    const part = last.slice(prefix.length)
    const n = Number.parseInt(part, 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

/** Referencia única: respeta la preferida si está libre; si no, asigna la siguiente secuencial. */
async function resolvePurchaseReference(preferred?: string): Promise<string> {
  const trimmed = preferred?.trim()
  if (trimmed) {
    const taken = await tenantQuery<{ id: string }>(
      `SELECT id FROM crm_purchases WHERE reference = $1 LIMIT 1`,
      [trimmed],
    )
    if (!taken.rows[0]) return trimmed
  }
  return nextPurchaseReference()
}

function productSummaryFromLines(
  lines: ComputedPurchaseLineWithCurrency[],
  fallback?: string,
): string {
  if (fallback?.trim()) return fallback.trim()
  return lines
    .map((l) => l.sku || l.productName)
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
}

async function insertPurchaseLines(
  client: PoolClient,
  purchaseId: string,
  lines: ComputedPurchaseLineWithCurrency[],
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    await client.query(
      `INSERT INTO crm_purchase_line_items (
        purchase_id, product_id, product_name, sku, description,
        quantity, quantity_received, unit_price_cents, discount_pct, total_cents, sort_order,
        price_currency, unit_price_original
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        purchaseId,
        line.productId ?? null,
        line.productName,
        line.sku,
        line.description,
        line.quantity,
        line.quantityReceived,
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

async function preparePurchaseLines(
  items: CreatePurchaseInput['lineItems'],
  orderDate: string | null | undefined,
) {
  if (!items?.length) {
    return {
      lines: [] as ComputedPurchaseLineWithCurrency[],
      exchangeRates: {
        exchangeRateDate: null,
        exchangeRateUf: null,
        exchangeRateUsd: null,
        exchangeRateEur: null,
      },
    }
  }

  const rates = await getExchangeRatesForDocumentDate(orderDate)
  const { assertDocumentLineProductsAreSellable } = await import(
    '../lib/assert-sellable-line-products.js'
  )
  await assertDocumentLineProductsAreSellable(items)
  const productPrices = await loadProductPricesByIds(
    collectProductIdsFromPurchaseItems(items),
  )
  const { lines, exchangeRates } = computePurchaseLinesWithCurrency(
    items,
    rates,
    productPrices,
  )
  return { lines, exchangeRates }
}


const PURCHASE_SORT_COLUMNS: Record<string, string> = {
  reference: 'reference',
  supplierName: 'supplier_name',
  amount: 'amount_cents',
  status: 'status',
  orderDate: 'order_date',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
}

export async function listPurchases(
  params: ListPurchasesParams,
): Promise<{ items: PurchaseListItem[]; total: number }> {
  const conditions: string[] = ['deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('archived_at IS NOT NULL')
  } else {
    conditions.push('archived_at IS NULL')
  }
  idx = pushTenantCondition(conditions, values, idx)
  idx = pushInListCondition(conditions, values, idx, 'status', params.status)
  if (params.q) {
    conditions.push(
      `(reference ILIKE $${idx} OR supplier_name ILIKE $${idx} OR product_summary ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'order_date',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    PURCHASE_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_purchases ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<PurchaseRow>(
      `SELECT ${PURCHASE_COLUMNS}
       FROM crm_purchases
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapPurchaseRow), total }
  })
}

export async function getPurchaseById(id: string): Promise<PurchaseDetail> {
  const result = await tenantQuery<PurchaseRow>(
    `SELECT ${PURCHASE_COLUMNS}
     FROM crm_purchases
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Orden de compra no encontrada')
  return mapPurchaseDetail(row, await loadPurchaseLines(id))
}

export async function createPurchase(
  input: CreatePurchaseInput,
  actor: AuditActor,
): Promise<PurchaseDetail> {
  await enforceRecordQuota(actor)
  const supplier = await resolveSupplier(input.supplierId, input.supplier)
  if (!supplier.supplierName) throw badRequest('El proveedor es obligatorio')

  const orderDate =
    parseDateInput(input.orderDate) ?? new Date().toISOString().slice(0, 10)
  const { lines, exchangeRates } = await preparePurchaseLines(
    input.lineItems,
    orderDate,
  )
  const lineTotal = sumLineTotals(lines)
  const amountCents =
    input.amountCents != null
      ? input.amountCents
      : input.amountNum != null
        ? Math.round(input.amountNum * 100)
        : input.amount
          ? parseMoneyToCents(input.amount)
          : lineTotal

  const reference = await resolvePurchaseReference(input.reference)
  const productSummary = productSummaryFromLines(lines, input.productSummary)
  const detail = detailInsertParams(input)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<PurchaseRow>(
      `INSERT INTO crm_purchases (
        reference, supplier_id, supplier_name, product_summary, order_date,
        amount_cents, status, payment_status, paid_at,
        description, expected_delivery, payment_terms,
        warehouse_id, warehouse_name, delivery_address,
        supplier_contact_id, supplier_contact_name, supplier_email, supplier_phone,
        owner_name,
        exchange_rate_uf, exchange_rate_usd, exchange_rate_eur, exchange_rate_date,
        created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        $25, $26, $25, $26, $27
      )
      RETURNING ${PURCHASE_COLUMNS}`,
      [
        reference,
        supplier.supplierId,
        supplier.supplierName,
        productSummary,
        orderDate,
        amountCents,
        input.status ?? 'Borrador',
        input.paymentStatus ?? 'Pendiente',
        input.paymentStatus === 'Pagada'
          ? (parseDateInput(input.paidAt ?? undefined) ??
            new Date().toISOString().slice(0, 10))
          : parseDateInput(input.paidAt ?? undefined),
        detail.description,
        detail.expectedDelivery,
        detail.paymentTerms,
        detail.warehouseId,
        detail.warehouseName,
        detail.deliveryAddress,
        detail.supplierContactId,
        detail.supplierContact,
        detail.supplierEmail,
        detail.supplierPhone,
        input.ownerName?.trim() || actor.userName,
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
    if (lines.length > 0) await insertPurchaseLines(client, row.id, lines)
    await client.query('COMMIT')
    const created = mapPurchaseDetail(row, await loadPurchaseLines(row.id))
    maybeNotifyRecordOwnerOnCreate({
      actor,
      nextOwner: created.owner ?? '',
      moduleLabel: 'la orden de compra',
      recordTitle: created.reference || created.id,
      href: `/compras/${created.id}`,
      entityType: 'compra',
      entityId: created.id,
    })
    return created
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function updatePurchase(
  id: string,
  input: UpdatePurchaseInput,
  actor: AuditActor,
): Promise<PurchaseDetail> {
  const existing = await getPurchaseById(id)
  const previousOwner = existing.owner ?? ''
  const linesResult =
    input.lineItems !== undefined
      ? await preparePurchaseLines(
          input.lineItems,
          input.orderDate !== undefined
            ? parseDateInput(input.orderDate)
            : existing.orderDate,
        )
      : null
  const lines = linesResult?.lines ?? null
  const exchangeRates = linesResult?.exchangeRates
  const supplier =
    input.supplierId !== undefined || input.supplier !== undefined
      ? await resolveSupplier(
          input.supplierId ?? existing.supplierId,
          input.supplier ?? existing.supplier,
        )
      : {
          supplierId: existing.supplierId ?? null,
          supplierName: existing.supplier,
        }

  const lineTotal = lines ? sumLineTotals(lines) : null
  const amountCents =
    input.amountCents != null
      ? input.amountCents
      : input.amountNum != null
        ? Math.round(input.amountNum * 100)
        : input.amount
          ? parseMoneyToCents(input.amount)
          : lineTotal ?? parseMoneyToCents(existing.amount)

  const hasDetailPatch =
    input.description !== undefined ||
    input.expectedDelivery !== undefined ||
    input.paymentTerms !== undefined ||
    input.warehouseId !== undefined ||
    input.warehouse !== undefined ||
    input.deliveryAddress !== undefined ||
    input.supplierContactId !== undefined ||
    input.supplierContact !== undefined ||
    input.supplierEmail !== undefined ||
    input.supplierPhone !== undefined

  const detailPatch = hasDetailPatch ? detailInsertParams(input) : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<PurchaseRow>(
      `UPDATE crm_purchases SET
        reference = COALESCE($2, reference),
        supplier_id = $3,
        supplier_name = $4,
        product_summary = COALESCE($5, product_summary),
        order_date = COALESCE($6, order_date),
        amount_cents = $7,
        status = COALESCE($8, status),
        payment_status = COALESCE($9, payment_status),
        paid_at = COALESCE($10, paid_at),
        description = COALESCE($11, description),
        expected_delivery = COALESCE($12, expected_delivery),
        payment_terms = COALESCE($13, payment_terms),
        warehouse_id = COALESCE($14, warehouse_id),
        warehouse_name = COALESCE($15, warehouse_name),
        delivery_address = COALESCE($16, delivery_address),
        supplier_contact_id = COALESCE($17, supplier_contact_id),
        supplier_contact_name = COALESCE($18, supplier_contact_name),
        supplier_email = COALESCE($19, supplier_email),
        supplier_phone = COALESCE($20, supplier_phone),
        owner_name = COALESCE($21, owner_name),
        exchange_rate_uf = COALESCE($22, exchange_rate_uf),
        exchange_rate_usd = COALESCE($23, exchange_rate_usd),
        exchange_rate_eur = COALESCE($24, exchange_rate_eur),
        exchange_rate_date = COALESCE($25, exchange_rate_date),
        updated_by_id = $26,
        updated_by_name = $27,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(28)}
      RETURNING ${PURCHASE_COLUMNS}`,
      [
        id,
        input.reference?.trim() || null,
        supplier.supplierId,
        supplier.supplierName,
        lines
          ? productSummaryFromLines(lines, input.productSummary)
          : input.productSummary?.trim() || null,
        parseDateInput(input.orderDate),
        amountCents,
        input.status ?? null,
        input.paymentStatus ?? null,
        input.paidAt !== undefined
          ? parseDateInput(input.paidAt ?? undefined)
          : input.paymentStatus === 'Pagada'
            ? new Date().toISOString().slice(0, 10)
            : null,
        detailPatch?.description ?? null,
        detailPatch?.expectedDelivery ?? null,
        detailPatch?.paymentTerms ?? null,
        detailPatch?.warehouseId ?? null,
        detailPatch?.warehouseName ?? null,
        detailPatch?.deliveryAddress ?? null,
        detailPatch?.supplierContactId ?? null,
        detailPatch?.supplierContact ?? null,
        detailPatch?.supplierEmail ?? null,
        detailPatch?.supplierPhone ?? null,
        input.ownerName?.trim() || null,
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
    if (!row) throw notFound('Orden de compra no encontrada')

    if (lines) {
      await client.query(`DELETE FROM crm_purchase_line_items WHERE purchase_id = $1`, [
        id,
      ])
      if (lines.length > 0) await insertPurchaseLines(client, id, lines)
    }

    await client.query('COMMIT')
    const detail = mapPurchaseDetail(row, await loadPurchaseLines(id))
    if (input.ownerName !== undefined) {
      maybeNotifyRecordOwnerChange({
        actor,
        previousOwner,
        nextOwner: detail.owner ?? '',
        moduleLabel: 'la orden de compra',
        recordTitle: detail.reference || detail.id,
        href: `/compras/${detail.id}`,
        entityType: 'compra',
        entityId: detail.id,
      })
    }
    return detail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function archivePurchase(
  id: string,
  actor: AuditActor,
): Promise<PurchaseListItem> {
  const result = await tenantQuery<PurchaseRow>(
    `UPDATE crm_purchases
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${PURCHASE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Orden de compra no encontrada o ya archivada')
  return mapPurchaseRow(row)
}

export async function restorePurchase(
  id: string,
  actor: AuditActor,
): Promise<PurchaseListItem> {
  const result = await tenantQuery<PurchaseRow>(
    `UPDATE crm_purchases
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${PURCHASE_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Orden de compra no encontrada')
  return mapPurchaseRow(row)
}

/** Elimina definitivamente una compra archivada y sus datos relacionados. */
export async function permanentlyDeletePurchase(id: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const found = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_purchases
       WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NOT NULL
       FOR UPDATE`,
      [id],
    )
    if (!found.rows[0]) {
      throw notFound('Orden de compra no encontrada en archivados')
    }

    // Mantener purchase_reference en ingresos confirmados (NOT NULL); FK pone purchase_id en NULL al borrar.
    await client.query(`DELETE FROM crm_purchase_line_items WHERE purchase_id = $1`, [
      id,
    ])
    await purgeEntityNotesAndFiles('compra', id, client)
    await client.query(`DELETE FROM crm_purchases WHERE id = $1`, [id])

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
