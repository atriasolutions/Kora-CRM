import type { PoolClient } from 'pg'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'

import { computeStockReceiptLines } from '../lib/line-items.js'
import {
  acquireSkuStockLocksOrdered,
  lockAllInventoryRowsBySku,
} from '../lib/inventory-stock-lock.js'
import {
  allocateNextStockReceiptNumber,
  isUniqueViolation,
} from '../lib/stock-receipt-number.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { deriveInventoryStatus } from '../mappers/inventory.mapper.js'
import {
  mapStockReceiptDetail,
  mapStockReceiptRow,
  type StockReceiptLineRow,
  type StockReceiptRow,
} from '../mappers/stock-receipt.mapper.js'
import { maybeNotifyRecordOwnerChange, maybeNotifyRecordOwnerOnCreate } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import { maybeNotifyInventoryStatusChange } from '../services/notifications.service.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateStockReceiptInput,
  StockReceiptDetail,
  StockReceiptListItem,
  UpdateStockReceiptInput,
} from '../types/stock-receipt.js'
import { paginationOffset } from '../utils/pagination.js'

import {
  parseCommaSeparatedList,
  pushDateRangeCondition,
  resolveOrderByClause,
} from '../lib/list-query.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'

const RECEIPT_COLUMNS = `
  id, number, status, external_reference, purchase_id, purchase_reference,
  supplier_name, warehouse_id, warehouse_name, product_summary, line_count,
  confirmed_at, owner_name,
  created_at, created_by_id, created_by_name,
  updated_at, updated_by_id, updated_by_name
`

const LINE_COLUMNS = `id, receipt_id, product_id, product_name, sku, quantity, sort_order`

export type ListStockReceiptsParams = {
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

async function loadReceiptLines(receiptId: string): Promise<StockReceiptLineRow[]> {
  const result = await tenantQuery<StockReceiptLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_stock_receipt_lines
     WHERE receipt_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [receiptId],
  )
  return result.rows
}

async function resolveWarehouse(
  warehouseId?: string,
  warehouseName?: string,
): Promise<{ warehouseId: string | null; warehouseName: string }> {
  if (warehouseId?.trim()) {
    const row = await tenantQuery<{ id: string; name: string }>(
      `SELECT id, name FROM crm_warehouses WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
      [warehouseId, getTenantIdOrDefault()],
    )
    if (row.rows[0]) {
      return { warehouseId: row.rows[0].id, warehouseName: row.rows[0].name }
    }
  }
  const name = warehouseName?.trim() || ''
  if (!name) {
    const def = await tenantQuery<{ id: string; name: string }>(
      `SELECT id, name FROM crm_warehouses
       WHERE deleted_at IS NULL AND is_default = true
       LIMIT 1`,
    )
    if (def.rows[0]) return { warehouseId: def.rows[0].id, warehouseName: def.rows[0].name }
    return { warehouseId: null, warehouseName: 'Bodega central' }
  }
  const byName = await tenantQuery<{ id: string; name: string }>(
    `SELECT id, name FROM crm_warehouses
     WHERE deleted_at IS NULL AND lower(trim(name)) = lower($1)
     LIMIT 1`,
    [name],
  )
  if (byName.rows[0]) {
    return { warehouseId: byName.rows[0].id, warehouseName: byName.rows[0].name }
  }
  return { warehouseId: null, warehouseName: name }
}

async function resolvePurchaseSnapshot(purchaseId?: string) {
  if (!purchaseId?.trim()) {
    return { purchaseId: null, purchaseReference: '', supplierName: '' }
  }
  const row = await tenantQuery<{
    id: string
    reference: string
    supplier_name: string
  }>(
    `SELECT id, reference, supplier_name
     FROM crm_purchases WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [purchaseId, getTenantIdOrDefault()],
  )
  const p = row.rows[0]
  if (!p) return { purchaseId: null, purchaseReference: '', supplierName: '' }
  return {
    purchaseId: p.id,
    purchaseReference: p.reference,
    supplierName: p.supplier_name,
  }
}

function productSummaryFromLines(
  lines: ReturnType<typeof computeStockReceiptLines>,
): string {
  return lines
    .map((l) => l.sku || l.productName)
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
}

async function insertReceiptLines(
  client: PoolClient,
  receiptId: string,
  lines: ReturnType<typeof computeStockReceiptLines>,
): Promise<void> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    await client.query(
      `INSERT INTO crm_stock_receipt_lines (
        receipt_id, product_id, product_name, sku, quantity, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        receiptId,
        line.productId ?? null,
        line.productName,
        line.sku,
        line.quantity,
        i,
      ],
    )
  }
}


const STOCK_RECEIPT_SORT_COLUMNS: Record<string, string> = {
  number: 'number',
  supplierName: 'supplier_name',
  status: 'status',
  confirmedAt: 'confirmed_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export async function listStockReceipts(
  params: ListStockReceiptsParams,
): Promise<{ items: StockReceiptListItem[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('deleted_at IS NOT NULL')
  } else {
    conditions.push('deleted_at IS NULL')
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
  if (params.q) {
    conditions.push(
      `(number ILIKE $${idx} OR supplier_name ILIKE $${idx} OR purchase_reference ILIKE $${idx} OR product_summary ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  idx = pushDateRangeCondition(
    conditions,
    values,
    idx,
    'COALESCE(confirmed_at, created_at)',
    params.dateFrom,
    params.dateTo,
  )

  const orderBy = resolveOrderByClause(
    params.sortBy,
    params.sortDir,
    STOCK_RECEIPT_SORT_COLUMNS,
    'updated_at DESC',
  )

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_stock_receipts ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<StockReceiptRow>(
      `SELECT ${RECEIPT_COLUMNS}
       FROM crm_stock_receipts
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows.map(mapStockReceiptRow), total }
  })
}

export async function getStockReceiptById(id: string): Promise<StockReceiptDetail> {
  const result = await tenantQuery<StockReceiptRow>(
    `SELECT ${RECEIPT_COLUMNS}
     FROM crm_stock_receipts
     WHERE id = $1`,
    [id],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Ingreso no encontrado')
  return mapStockReceiptDetail(row, await loadReceiptLines(id))
}

export async function createStockReceipt(
  input: CreateStockReceiptInput,
  actor: AuditActor,
): Promise<StockReceiptDetail> {
  await enforceRecordQuota(actor)
  const warehouse = await resolveWarehouse(input.warehouseId, input.warehouse)
  const purchase = await resolvePurchaseSnapshot(input.purchaseId)
  const { assertDocumentLineProductsAreSellable } = await import(
    '../lib/assert-sellable-line-products.js'
  )
  await assertDocumentLineProductsAreSellable(input.lineItems)
  const lines = computeStockReceiptLines(input.lineItems)

  const client = await pool.connect()
  const MAX_ATTEMPTS = 3
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await client.query('BEGIN')
    await setTenantLocal(client)
        const number = await allocateNextStockReceiptNumber(client)
        const result = await client.query<StockReceiptRow>(
          `INSERT INTO crm_stock_receipts (
            number, status, external_reference, purchase_id, purchase_reference,
            supplier_name, warehouse_id, warehouse_name, product_summary, line_count,
            owner_name, created_by_id, created_by_name, updated_by_id, updated_by_name, tenant_id
          ) VALUES (
            $1, 'Borrador', $2, $3, $4,
            $5, $6, $7, $8, $9,
            $10, $11, $12, $11, $12, $13
          )
          RETURNING ${RECEIPT_COLUMNS}`,
          [
            number,
            input.externalReference?.trim() || null,
            purchase.purchaseId,
            purchase.purchaseReference || input.purchaseReference?.trim() || '',
            input.supplier?.trim() || purchase.supplierName,
            warehouse.warehouseId,
            warehouse.warehouseName,
            productSummaryFromLines(lines),
            lines.length,
            input.ownerName?.trim() || actor.userName,
            actor.userId,
            actor.userName,
            getTenantIdOrDefault(),
          ],
        )
        const row = result.rows[0]!
        if (lines.length > 0) await insertReceiptLines(client, row.id, lines)
        await client.query('COMMIT')
        const detail = mapStockReceiptDetail(row, await loadReceiptLines(row.id))
        maybeNotifyRecordOwnerOnCreate({
          actor,
          nextOwner: detail.owner ?? '',
          moduleLabel: 'el ingreso de stock',
          recordTitle: detail.number || detail.externalReference || detail.id,
          href: `/ingresos/${detail.id}`,
          entityType: 'ingreso',
          entityId: detail.id,
        })
        return detail
      } catch (e) {
        await client.query('ROLLBACK')
        if (isUniqueViolation(e) && attempt < MAX_ATTEMPTS) continue
        throw e
      }
    }
    throw badRequest('No se pudo asignar el número de ingreso. Intenta de nuevo.')
  } finally {
    client.release()
  }
}

export async function updateStockReceipt(
  id: string,
  input: UpdateStockReceiptInput,
  actor: AuditActor,
): Promise<StockReceiptDetail> {
  const existing = await getStockReceiptById(id)
  const previousOwner = existing.owner ?? ''
  if (existing.status === 'Confirmado' && input.status !== 'Borrador') {
    throw badRequest('No se puede editar un ingreso confirmado')
  }

  const warehouse =
    input.warehouseId !== undefined || input.warehouse !== undefined
      ? await resolveWarehouse(
          input.warehouseId ?? existing.warehouseId,
          input.warehouse ?? existing.warehouse,
        )
      : {
          warehouseId: existing.warehouseId ?? null,
          warehouseName: existing.warehouse,
        }

  const purchase =
    input.purchaseId !== undefined
      ? await resolvePurchaseSnapshot(input.purchaseId)
      : {
          purchaseId: existing.purchaseId ?? null,
          purchaseReference: existing.purchaseReference ?? '',
          supplierName: existing.supplier ?? '',
        }

  const lines =
    input.lineItems !== undefined ? computeStockReceiptLines(input.lineItems) : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const result = await client.query<StockReceiptRow>(
      `UPDATE crm_stock_receipts SET
        external_reference = COALESCE($2, external_reference),
        purchase_id = $3,
        purchase_reference = $4,
        supplier_name = COALESCE($5, supplier_name),
        warehouse_id = $6,
        warehouse_name = $7,
        product_summary = COALESCE($8, product_summary),
        line_count = COALESCE($9, line_count),
        status = COALESCE($10, status),
        owner_name = COALESCE($11, owner_name),
        updated_by_id = $12,
        updated_by_name = $13,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(14)}
      RETURNING ${RECEIPT_COLUMNS}`,
      [
        id,
        input.externalReference?.trim() || null,
        purchase.purchaseId,
        purchase.purchaseReference || input.purchaseReference?.trim() || '',
        input.supplier?.trim() || purchase.supplierName || null,
        warehouse.warehouseId,
        warehouse.warehouseName,
        lines ? productSummaryFromLines(lines) : null,
        lines ? lines.length : null,
        input.status ?? null,
        input.ownerName?.trim() || null,
        actor.userId,
        actor.userName,
        getTenantIdOrDefault(),
      ],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Ingreso no encontrado')

    if (lines) {
      await client.query(`DELETE FROM crm_stock_receipt_lines WHERE receipt_id = $1`, [
        id,
      ])
      if (lines.length > 0) await insertReceiptLines(client, id, lines)
    }

    await client.query('COMMIT')
    const detail = mapStockReceiptDetail(row, await loadReceiptLines(id))
    if (input.ownerName !== undefined) {
      maybeNotifyRecordOwnerChange({
        actor,
        previousOwner,
        nextOwner: detail.owner ?? '',
        moduleLabel: 'el ingreso de stock',
        recordTitle: detail.number || detail.externalReference || detail.id,
        href: `/ingresos/${detail.id}`,
        entityType: 'ingreso',
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

async function applyStockForReceipt(
  client: PoolClient,
  receipt: StockReceiptRow,
  lines: StockReceiptLineRow[],
  actor: AuditActor,
): Promise<void> {
  const reference = `Ingreso ${receipt.number}`.slice(0, 80)

  const stockLines = lines.filter((line) => {
    const sku = line.sku?.trim()
    const qty = Number(line.quantity ?? 0)
    return Boolean(sku) && qty > 0
  })
  await acquireSkuStockLocksOrdered(
    client,
    stockLines.map((line) => line.sku!.trim()),
  )

  for (const line of stockLines) {
    const sku = line.sku!.trim()
    const qty = Number(line.quantity ?? 0)

    const productRow = await client.query<{
      id: string
      name: string
      track_inventory: boolean
    }>(
      `SELECT id, name, track_inventory FROM crm_products
       WHERE deleted_at IS NULL AND lower(trim(sku)) = lower($1)
       LIMIT 1`,
      [sku],
    )
    const product = productRow.rows[0]

    await lockAllInventoryRowsBySku(client, sku)

    let position = await client.query<{
      id: string
      quantity_on_hand: string
      quantity_reserved: string
      min_stock: string | null
      status: string | null
    }>(
      `SELECT id, quantity_on_hand, quantity_reserved, min_stock, status
       FROM crm_inventory_positions
       WHERE lower(trim(sku)) = lower(trim($1))
         AND warehouse_id IS NOT DISTINCT FROM $2
       FOR UPDATE`,
      [sku, receipt.warehouse_id],
    )

    if (!position.rows[0]) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO crm_inventory_positions (
          product_id, product_name, sku, warehouse_id, warehouse_name,
          quantity_on_hand, quantity_reserved, quantity_available, min_stock, status,
          last_movement_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, 'Sin stock', now(), $6)
        RETURNING id`,
        [
          product?.id ?? line.product_id,
          product?.name ?? line.product_name,
          sku,
          receipt.warehouse_id,
          receipt.warehouse_name,
          getTenantIdOrDefault(),
        ],
      )
      position = await client.query(
        `SELECT id, quantity_on_hand, quantity_reserved, min_stock, status
         FROM crm_inventory_positions WHERE id = $1 FOR UPDATE`,
        [inserted.rows[0]!.id],
      )
    }

    const pos = position.rows[0]!
    const onHand = Number(pos.quantity_on_hand) + qty
    const reserved = Number(pos.quantity_reserved)
    const available = onHand
    const minStock = Number(pos.min_stock ?? 0)
    const prevStatus = pos.status ?? ''
    const status = deriveInventoryStatus(onHand, reserved, minStock, null)

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_on_hand = $2,
        quantity_available = $3,
        status = $4,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, onHand, available, status],
    )

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Entrada', $5, $6, 0, $7, $8, 'ingreso', $9)`,
      [
        pos.id,
        product?.id ?? line.product_id,
        product?.name ?? line.product_name,
        sku,
        reference,
        qty,
        actor.userId,
        actor.userName,
        receipt.id,
      ],
    )

    if (prevStatus !== status) {
      void maybeNotifyInventoryStatusChange({
        actor,
        inventoryPositionId: pos.id,
        productName: product?.name ?? line.product_name,
        warehouseName: receipt.warehouse_name,
        sku,
        previousStatus: prevStatus,
        nextStatus: status,
      }).catch(() => {
        /* ignore realtime errors */
      })
    }
  }
}

export async function confirmStockReceipt(
  id: string,
  actor: AuditActor,
): Promise<StockReceiptDetail> {
  const existing = await getStockReceiptById(id)
  if (existing.status === 'Confirmado') {
    throw badRequest('Este ingreso ya está confirmado')
  }

  const lines = await loadReceiptLines(id)
  if (lines.length === 0) throw badRequest('El ingreso no tiene líneas')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const receiptRow = await client.query<StockReceiptRow>(
      `SELECT ${RECEIPT_COLUMNS} FROM crm_stock_receipts WHERE id = $1 FOR UPDATE`,
      [id],
    )
    const receipt = receiptRow.rows[0]
    if (!receipt) throw notFound('Ingreso no encontrado')

    await applyStockForReceipt(client, receipt, lines, actor)

    const updated = await client.query<StockReceiptRow>(
      `UPDATE crm_stock_receipts SET
        status = 'Confirmado',
        confirmed_at = now(),
        updated_by_id = $2,
        updated_by_name = $3,
        updated_at = now()
      WHERE id = $1
      RETURNING ${RECEIPT_COLUMNS}`,
      [id, actor.userId, actor.userName],
    )

    await client.query('COMMIT')
    return mapStockReceiptDetail(updated.rows[0]!, lines)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function archiveStockReceipt(
  id: string,
  actor: AuditActor,
): Promise<StockReceiptListItem> {
  const result = await tenantQuery<StockReceiptRow>(
    `UPDATE crm_stock_receipts
     SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING ${RECEIPT_COLUMNS}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Ingreso no encontrado o ya archivado')
  return mapStockReceiptRow(row)
}

export async function restoreStockReceipt(
  id: string,
  actor: AuditActor,
): Promise<StockReceiptListItem> {
  const result = await tenantQuery<StockReceiptRow>(
    `UPDATE crm_stock_receipts
     SET deleted_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1
     RETURNING ${RECEIPT_COLUMNS}`,
    [id, actor.userId, actor.userName],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Ingreso no encontrado')
  return mapStockReceiptRow(row)
}

async function revertStockForReceipt(
  client: PoolClient,
  receipt: StockReceiptRow,
  actor: AuditActor,
): Promise<void> {
  if (receipt.status !== 'Confirmado') return

  const lines = await client.query<StockReceiptLineRow>(
    `SELECT ${LINE_COLUMNS}
     FROM crm_stock_receipt_lines
     WHERE receipt_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [receipt.id],
  )

  const stockLines = lines.rows.filter((line) => {
    const sku = line.sku?.trim()
    const qty = Number(line.quantity ?? 0)
    return Boolean(sku) && qty > 0
  })
  if (stockLines.length === 0) return

  await acquireSkuStockLocksOrdered(
    client,
    stockLines.map((line) => line.sku.trim()),
  )

  for (const line of stockLines) {
    const sku = line.sku.trim()
    const qty = Number(line.quantity ?? 0)

    await lockAllInventoryRowsBySku(client, sku)

    const position = await client.query<{
      id: string
      quantity_on_hand: string
      quantity_reserved: string
      min_stock: string | null
      status: string | null
      product_name: string
    }>(
      `SELECT id, quantity_on_hand, quantity_reserved, min_stock, status, product_name
       FROM crm_inventory_positions
       WHERE lower(trim(sku)) = lower(trim($1))
         AND warehouse_id IS NOT DISTINCT FROM $2
       FOR UPDATE`,
      [sku, receipt.warehouse_id],
    )

    const pos = position.rows[0]
    if (!pos) continue

    const onHand = Math.max(0, Number(pos.quantity_on_hand) - qty)
    const reserved = Number(pos.quantity_reserved)
    const available = onHand
    const minStock = Number(pos.min_stock ?? 0)
    const prevStatus = pos.status ?? ''
    const status = deriveInventoryStatus(onHand, reserved, minStock, null)

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_on_hand = $2,
        quantity_available = $3,
        status = $4,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, onHand, available, status],
    )

    if (prevStatus !== status) {
      void maybeNotifyInventoryStatusChange({
        actor,
        inventoryPositionId: pos.id,
        productName: line.product_name || pos.product_name,
        warehouseName: receipt.warehouse_name,
        sku,
        previousStatus: prevStatus,
        nextStatus: status,
      }).catch(() => {
        /* ignore realtime errors */
      })
    }
  }

  await client.query(
    `DELETE FROM crm_stock_movements
     WHERE source_kind = 'ingreso' AND source_id = $1`,
    [receipt.id],
  )
}

/** Elimina definitivamente un ingreso archivado y revierte stock si estaba confirmado. */
export async function permanentlyDeleteStockReceipt(
  id: string,
  actor: AuditActor,
): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const found = await client.query<StockReceiptRow>(
      `SELECT ${RECEIPT_COLUMNS}
       FROM crm_stock_receipts
       WHERE id = $1 AND deleted_at IS NOT NULL
       FOR UPDATE`,
      [id],
    )
    const receipt = found.rows[0]
    if (!receipt) {
      throw notFound('Ingreso no encontrado en archivados')
    }

    await revertStockForReceipt(client, receipt, actor)

    await client.query(`DELETE FROM crm_stock_receipt_lines WHERE receipt_id = $1`, [
      id,
    ])
    await purgeEntityNotesAndFiles('recepcion', id, client)
    await client.query(`DELETE FROM crm_stock_receipts WHERE id = $1`, [id])

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
