import type { PoolClient } from 'pg'

import {
  acquireSkuStockLock,
  acquireSkuStockLocksOrdered,
  lockAllInventoryRowsBySku,
} from '../lib/inventory-stock-lock.js'
import { computeAvailableQuantity } from '../lib/inventory-quantity.js'
import { deriveOperationalInventoryStatus } from '../mappers/inventory.mapper.js'
import { badRequest } from '../middleware/errors.js'
import { maybeNotifyInventoryStatusChange } from '../services/notifications.service.js'
import type { AuditActor } from '../types/audit.js'

type InventoryPositionRow = {
  id: string
  product_id: string | null
  product_name: string
  sku: string
  warehouse_name: string | null
  quantity_on_hand: string | number
  quantity_reserved: string | number
  quantity_available: string | number
  min_stock: string | number | null
  status: string | null
}

type QuoteLineRow = {
  id: string
  sku: string
  product_id: string | null
  product_name: string
  description: string | null
  quantity: string | number
}

const POSITION_COLUMNS = `
  id, product_id, product_name, sku, warehouse_name,
  quantity_on_hand, quantity_reserved, quantity_available, min_stock, status
`

const RELEASE_QUOTE_STATUSES = new Set([
  'Rechazada',
  'Cancelada',
  'Vencida',
  'Borrador',
  'En revisión interna',
  'Enviada',
  'En negociación',
  'En espera cliente',
])

export function shouldReleaseQuoteReservation(
  fromStatus: string,
  toStatus: string,
): boolean {
  return fromStatus === 'Aceptada' && RELEASE_QUOTE_STATUSES.has(toStatus)
}

export function shouldReserveQuoteOnStatus(status: string): boolean {
  return status === 'Aceptada'
}

/** Cotización con factura emitida o pagada: no crear reservas nuevas. */
async function quoteHasEmittedInvoice(
  client: PoolClient,
  quoteId: string,
): Promise<boolean> {
  const result = await client.query<{ ok: string }>(
    `SELECT 1 AS ok
     FROM crm_invoices
     WHERE quote_id = $1
       AND deleted_at IS NULL
       AND status IN ('Pendiente', 'Pagada')
     LIMIT 1`,
    [quoteId],
  )
  return result.rows.length > 0
}

async function countBlockingQuoteReservations(
  client: PoolClient,
  quoteId: string,
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_stock_reservations
     WHERE quote_id = $1
       AND status IN ('active', 'transferred', 'committed')`,
    [quoteId],
  )
  return Number.parseInt(result.rows[0]?.count ?? '0', 10)
}

async function sumOpenReservedForSku(
  client: PoolClient,
  sku: string,
): Promise<number> {
  const result = await client.query<{ total: string }>(
    `SELECT COALESCE(SUM(qty), 0)::text AS total
     FROM crm_stock_reservations
     WHERE lower(trim(sku)) = lower(trim($1))
       AND status IN ('active', 'transferred')`,
    [sku],
  )
  return Number(result.rows[0]?.total ?? 0)
}

/** Alinea quantity_reserved con reservas activas/transferred (no committed). */
export async function reconcileInventoryPositionForSku(
  client: PoolClient,
  sku: string,
  actor?: AuditActor,
): Promise<boolean> {
  const pos = await lockInventoryBySku(client, sku)
  if (!pos) return false

  const reserved = await sumOpenReservedForSku(client, sku)
  const onHand = Number(pos.quantity_on_hand)
  const available = computeAvailableQuantity(onHand)
  const currentReserved = Number(pos.quantity_reserved)

  if (
    Math.abs(currentReserved - reserved) < 1e-6 &&
    Math.abs(Number(pos.quantity_available) - available) < 1e-6
  ) {
    return false
  }

  const minStock = Number(pos.min_stock ?? 0)
  const previousStatus = pos.status ?? 'En stock'
  const status = deriveOperationalInventoryStatus(
    onHand,
    reserved,
    minStock,
    pos.status,
  )

  await client.query(
    `UPDATE crm_inventory_positions SET
      quantity_reserved = $2,
      quantity_available = $3,
      status = $4,
      last_movement_at = now(),
      updated_at = now()
    WHERE id = $1`,
    [pos.id, reserved, available, status],
  )

  if (actor) {
    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: pos.id,
      productName: pos.product_name,
      warehouseName: pos.warehouse_name ?? '',
      sku: pos.sku,
      previousStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })
  }

  return true
}

async function reconcileInventoryForSkus(
  client: PoolClient,
  skus: Iterable<string>,
  actor?: AuditActor,
): Promise<void> {
  const unique = [...new Set([...skus].map((s) => s.trim()).filter(Boolean))]
  for (const sku of unique) {
    await reconcileInventoryPositionForSku(client, sku, actor)
  }
}

async function loadQuoteLines(
  client: PoolClient,
  quoteId: string,
): Promise<QuoteLineRow[]> {
  const result = await client.query<QuoteLineRow>(
    `SELECT id, sku, product_id, product_name, description, quantity
     FROM crm_quote_line_items
     WHERE quote_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [quoteId],
  )
  return result.rows
}

async function lockInventoryBySku(
  client: PoolClient,
  sku: string,
): Promise<InventoryPositionRow | undefined> {
  const trimmed = sku.trim()
  if (!trimmed) return undefined
  await lockAllInventoryRowsBySku(client, trimmed)
  const result = await client.query<InventoryPositionRow>(
    `SELECT ${POSITION_COLUMNS}
     FROM crm_inventory_positions
     WHERE lower(trim(sku)) = lower(trim($1))
     ORDER BY quantity_on_hand DESC, quantity_available DESC, id ASC
     LIMIT 1`,
    [trimmed],
  )
  return result.rows[0]
}

async function hasActiveReservationForQuoteLine(
  client: PoolClient,
  quoteId: string,
  quoteLineId: string,
): Promise<boolean> {
  const result = await client.query<{ ok: string }>(
    `SELECT 1 AS ok
     FROM crm_stock_reservations
     WHERE quote_id = $1
       AND quote_line_id = $2
       AND status IN ('active', 'transferred', 'committed')
     LIMIT 1`,
    [quoteId, quoteLineId],
  )
  return result.rows.length > 0
}

async function applyReservationToPosition(
  client: PoolClient,
  pos: InventoryPositionRow,
  qty: number,
  quoteId: string,
  quoteCode: string,
  quoteLineId: string,
  reference: string,
  actor: AuditActor,
): Promise<void> {
  const onHand = Number(pos.quantity_on_hand)
  const reserved = Number(pos.quantity_reserved)
  const minStock = Number(pos.min_stock ?? 0)

  // Compromiso comercial: la cotización aceptada reserva la cantidad pedida aunque supere el disponible.
  const newReserved = reserved + qty
  const newAvailable = computeAvailableQuantity(onHand)
  const status = deriveOperationalInventoryStatus(
    onHand,
    newReserved,
    minStock,
    pos.status,
  )

  const previousStatus = pos.status ?? 'En stock'

  await client.query(
    `UPDATE crm_inventory_positions SET
      quantity_reserved = $2,
      quantity_available = $3,
      status = $4,
      last_movement_at = now(),
      updated_at = now()
    WHERE id = $1`,
    [pos.id, newReserved, newAvailable, status],
  )

  void maybeNotifyInventoryStatusChange({
    actor,
    inventoryPositionId: pos.id,
    productName: pos.product_name,
    warehouseName: pos.warehouse_name ?? '',
    sku: pos.sku,
    previousStatus,
    nextStatus: status,
  }).catch(() => {
    /* ignore realtime errors */
  })

  await client.query(
    `INSERT INTO crm_stock_reservations (
      inventory_position_id, product_id, product_name, sku, qty,
      quote_id, quote_code, quote_line_id, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
    [
      pos.id,
      pos.product_id,
      pos.product_name,
      pos.sku,
      qty,
      quoteId,
      quoteCode,
      quoteLineId,
    ],
  )

  await client.query(
    `INSERT INTO crm_stock_movements (
      inventory_position_id, product_id, product_name, sku,
      movement_type, reference, quantity_delta, reserved_delta,
      author_user_id, author_name, source_kind, source_id
    ) VALUES ($1, $2, $3, $4, 'Reserva', $5, 0, $6, $7, $8, 'cotizacion', $9)`,
    [
      pos.id,
      pos.product_id,
      pos.product_name,
      pos.sku,
      reference,
      qty,
      actor.userId,
      actor.userName,
      quoteId,
    ],
  )
}

export async function reserveStockForQuote(
  client: PoolClient,
  quoteId: string,
  quoteCode: string,
  actor: AuditActor,
): Promise<void> {
  if (await quoteHasEmittedInvoice(client, quoteId)) return

  const lines = await loadQuoteLines(client, quoteId)
  const meaningful = lines.filter((line) => line.sku?.trim() && Number(line.quantity) > 0)
  if (meaningful.length === 0) return

  await acquireSkuStockLocksOrdered(
    client,
    meaningful.map((line) => line.sku),
  )

  const blocking = await countBlockingQuoteReservations(client, quoteId)
  if (blocking >= meaningful.length) return

  const trackedSkus = await skusWithInventoryControl(
    client,
    meaningful.map((line) => line.sku),
  )

  for (const line of meaningful) {
    const sku = line.sku.trim()
    if (!trackedSkus.has(sku.toLowerCase())) continue
    const qty = Number(line.quantity)
    if (await hasActiveReservationForQuoteLine(client, quoteId, line.id)) {
      continue
    }
    const pos = await lockInventoryBySku(client, sku)
    if (!pos) continue
    await applyReservationToPosition(
      client,
      pos,
      qty,
      quoteId,
      quoteCode,
      line.id,
      `COT ${quoteCode}`,
      actor,
    )
  }

  await reconcileInventoryForSkus(
    client,
    meaningful.map((line) => line.sku),
    actor,
  )
}

export async function releaseStockForQuote(
  client: PoolClient,
  quoteId: string,
  reference: string,
  actor: AuditActor,
): Promise<void> {
  const reservations = await client.query<{
    id: string
    inventory_position_id: string
    product_id: string | null
    product_name: string
    sku: string
    qty: string | number
  }>(
    `SELECT id, inventory_position_id, product_id, product_name, sku, qty
     FROM crm_stock_reservations
     WHERE quote_id = $1 AND status = 'active'`,
    [quoteId],
  )

  if (reservations.rows.length === 0) return

  await acquireSkuStockLocksOrdered(
    client,
    reservations.rows.map((r) => r.sku),
  )

  for (const res of reservations.rows) {
    await acquireSkuStockLock(client, res.sku)
    const posResult = await client.query<InventoryPositionRow>(
      `SELECT ${POSITION_COLUMNS}
       FROM crm_inventory_positions
       WHERE id = $1
       FOR UPDATE`,
      [res.inventory_position_id],
    )
    const pos = posResult.rows[0]
    if (!pos) continue

    const qty = Number(res.qty)
    const onHand = Number(pos.quantity_on_hand)
    const reserved = Math.max(0, Number(pos.quantity_reserved) - qty)
    const available = computeAvailableQuantity(onHand)
    const minStock = Number(pos.min_stock ?? 0)
    const previousStatus = pos.status ?? 'En stock'
    const status = deriveOperationalInventoryStatus(
      onHand,
      reserved,
      minStock,
      pos.status,
    )

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_reserved = $2,
        quantity_available = $3,
        status = $4,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, reserved, available, status],
    )

    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: pos.id,
      productName: pos.product_name,
      warehouseName: pos.warehouse_name ?? '',
      sku: pos.sku,
      previousStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Liberación', $5, 0, $6, $7, $8, 'cotizacion', $9)`,
      [
        pos.id,
        res.product_id,
        res.product_name,
        res.sku,
        reference,
        -qty,
        actor.userId,
        actor.userName,
        quoteId,
      ],
    )

    await client.query(
      `UPDATE crm_stock_reservations SET status = 'released' WHERE id = $1`,
      [res.id],
    )
  }

  await reconcileInventoryForSkus(
    client,
    reservations.rows.map((r) => r.sku),
    actor,
  )
}

export async function syncQuoteStockOnStatusChange(
  client: PoolClient,
  quoteId: string,
  quoteCode: string,
  previousStatus: string,
  nextStatus: string,
  actor: AuditActor,
): Promise<void> {
  if (previousStatus !== nextStatus) {
    if (shouldReserveQuoteOnStatus(nextStatus)) {
      await reserveStockForQuote(client, quoteId, quoteCode, actor)
    } else if (shouldReleaseQuoteReservation(previousStatus, nextStatus)) {
      await releaseStockForQuote(
        client,
        quoteId,
        `COT ${quoteCode} → ${nextStatus}`,
        actor,
      )
    }
  } else if (
    shouldReserveQuoteOnStatus(nextStatus) &&
    !(await quoteHasEmittedInvoice(client, quoteId))
  ) {
    await reserveStockForQuote(client, quoteId, quoteCode, actor)
  }
}

export async function transferQuoteReservationsToInvoice(
  client: PoolClient,
  quoteId: string,
  invoiceId: string,
  invoiceNumber: string,
): Promise<void> {
  const lines = await loadQuoteLines(client, quoteId)
  await acquireSkuStockLocksOrdered(
    client,
    lines.map((line) => line.sku),
  )
  await client.query(
    `UPDATE crm_stock_reservations SET
      invoice_id = $2,
      invoice_number = $3,
      status = 'transferred'
     WHERE quote_id = $1 AND status = 'active'`,
    [quoteId, invoiceId, invoiceNumber],
  )
}

type InvoiceReservationRow = {
  id: string
  inventory_position_id: string
  product_id: string | null
  product_name: string
  sku: string
  qty: string | number
}

async function loadInvoiceQuoteId(
  client: PoolClient,
  invoiceId: string,
): Promise<string | null> {
  const result = await client.query<{ quote_id: string | null }>(
    `SELECT quote_id FROM crm_invoices WHERE id = $1 AND deleted_at IS NULL`,
    [invoiceId],
  )
  const quoteId = result.rows[0]?.quote_id?.trim()
  return quoteId || null
}

/** Reservas pendientes de facturar: en la factura o aún activas en la cotización vinculada. */
async function loadPendingReservationsForInvoiceCommit(
  client: PoolClient,
  invoiceId: string,
  quoteId: string | null,
): Promise<InvoiceReservationRow[]> {
  if (quoteId) {
    const result = await client.query<InvoiceReservationRow>(
      `SELECT id, inventory_position_id, product_id, product_name, sku, qty
       FROM crm_stock_reservations
       WHERE status IN ('active', 'transferred')
         AND (invoice_id = $1 OR quote_id = $2)
       ORDER BY
         CASE WHEN invoice_id = $1 THEN 0 ELSE 1 END,
         created_at ASC`,
      [invoiceId, quoteId],
    )
    return result.rows
  }

  const result = await client.query<InvoiceReservationRow>(
    `SELECT id, inventory_position_id, product_id, product_name, sku, qty
     FROM crm_stock_reservations
     WHERE invoice_id = $1 AND status IN ('active', 'transferred')`,
    [invoiceId],
  )
  return result.rows
}

function aggregateReservationQtyBySku(
  rows: InvoiceReservationRow[],
): { sku: string; product_name: string; quantity: number }[] {
  const map = new Map<string, { product_name: string; quantity: number }>()
  for (const row of rows) {
    const sku = row.sku.trim()
    if (!sku) continue
    const qty = Number(row.qty)
    const prev = map.get(sku)
    map.set(sku, {
      product_name: row.product_name,
      quantity: (prev?.quantity ?? 0) + qty,
    })
  }
  return [...map.entries()].map(([sku, value]) => ({
    sku,
    product_name: value.product_name,
    quantity: value.quantity,
  }))
}

/** SKUs cuyo producto en catálogo tiene control de inventario (track_inventory). */
async function skusWithInventoryControl(
  client: PoolClient,
  skus: string[],
): Promise<Set<string>> {
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  if (unique.length === 0) return new Set()

  const result = await client.query<{ sku: string }>(
    `SELECT DISTINCT lower(trim(sku)) AS sku
     FROM crm_products
     WHERE deleted_at IS NULL
       AND track_inventory = true
       AND lower(trim(sku)) = ANY(
         SELECT lower(trim(s)) FROM unnest($1::text[]) AS s
       )`,
    [unique],
  )
  return new Set(result.rows.map((r) => r.sku))
}

async function filterLinesRequiringStockControl<T extends { sku: string }>(
  client: PoolClient,
  lines: T[],
): Promise<T[]> {
  if (lines.length === 0) return []
  const tracked = await skusWithInventoryControl(
    client,
    lines.map((line) => line.sku),
  )
  return lines.filter((line) => tracked.has(line.sku.trim().toLowerCase()))
}

async function filterReservationsRequiringStockControl(
  client: PoolClient,
  rows: InvoiceReservationRow[],
): Promise<InvoiceReservationRow[]> {
  if (rows.length === 0) return []
  const tracked = await skusWithInventoryControl(
    client,
    rows.map((row) => row.sku),
  )
  return rows.filter((row) => tracked.has(row.sku.trim().toLowerCase()))
}

async function loadInvoiceLinesForStock(
  client: PoolClient,
  invoiceId: string,
): Promise<{ sku: string; product_name: string; quantity: number }[]> {
  const result = await client.query<{
    sku: string
    product_name: string
    quantity: string | number
  }>(
    `SELECT sku, product_name, quantity
     FROM crm_invoice_line_items
     WHERE invoice_id = $1 AND trim(sku) <> ''`,
    [invoiceId],
  )
  return result.rows
    .map((row) => ({
      sku: row.sku.trim(),
      product_name: row.product_name,
      quantity: Number(row.quantity),
    }))
    .filter((row) => row.quantity > 0)
}

/** Exige stock físico en bodega al emitir la factura (salir de Borrador). */
export async function assertInvoiceStockAvailableForCommit(
  client: PoolClient,
  invoiceId: string,
): Promise<void> {
  const quoteId = await loadInvoiceQuoteId(client, invoiceId)
  const reservations = await loadPendingReservationsForInvoiceCommit(
    client,
    invoiceId,
    quoteId,
  )

  const rawLines =
    reservations.length > 0
      ? aggregateReservationQtyBySku(
          await filterReservationsRequiringStockControl(client, reservations),
        )
      : await loadInvoiceLinesForStock(client, invoiceId)

  const linesToCheck = await filterLinesRequiringStockControl(client, rawLines)
  if (linesToCheck.length === 0) return

  await acquireSkuStockLocksOrdered(
    client,
    linesToCheck.map((line) => line.sku),
  )

  for (const line of linesToCheck) {
    const pos = await lockInventoryBySku(client, line.sku)
    if (!pos) {
      throw badRequest(
        `No hay inventario para SKU ${line.sku} al emitir la factura.`,
      )
    }
    const onHand = Number(pos.quantity_on_hand)
    if (onHand < line.quantity) {
      throw badRequest(
        `Stock insuficiente para emitir la factura: ${line.product_name} (${line.sku}) requiere ${line.quantity} u. y hay ${onHand} en bodega.`,
      )
    }
  }
}

/** Salidas registradas sin reservas comprometidas (p. ej. intento fallido a mitad de transacción). */
async function removeOrphanInvoiceSalidaMovements(
  client: PoolClient,
  invoiceId: string,
): Promise<void> {
  const committed = await client.query<{ ok: string }>(
    `SELECT 1 AS ok
     FROM crm_stock_reservations
     WHERE invoice_id = $1 AND status = 'committed'
     LIMIT 1`,
    [invoiceId],
  )
  if (committed.rows.length > 0) return

  await client.query(
    `DELETE FROM crm_stock_movements
     WHERE source_kind = 'factura'
       AND source_id = $1
       AND movement_type = 'Salida'`,
    [invoiceId],
  )
}

async function loadInvoiceSalidaQtyBySku(
  client: PoolClient,
  invoiceId: string,
): Promise<Map<string, number>> {
  const result = await client.query<{ sku: string; qty: string }>(
    `SELECT lower(trim(sku)) AS sku, COALESCE(SUM(ABS(quantity_delta)), 0) AS qty
     FROM crm_stock_movements
     WHERE source_kind = 'factura'
       AND source_id = $1
       AND movement_type = 'Salida'
     GROUP BY lower(trim(sku))`,
    [invoiceId],
  )
  return new Map(result.rows.map((row) => [row.sku, Number(row.qty ?? 0)]))
}

async function deleteInvoiceSalidaMovements(
  client: PoolClient,
  invoiceId: string,
): Promise<void> {
  await client.query(
    `DELETE FROM crm_stock_movements
     WHERE source_kind = 'factura'
       AND source_id = $1
       AND movement_type = 'Salida'`,
    [invoiceId],
  )
}

type ReservationRevertRow = {
  id: string
  inventory_position_id: string
  product_id: string | null
  product_name: string
  sku: string
  qty: string | number
  quote_id: string | null
}

async function applyInventoryAfterInvoiceRevert(
  client: PoolClient,
  pos: InventoryPositionRow,
  qty: number,
  restoreReserved: boolean,
  actor: AuditActor,
): Promise<InventoryPositionRow> {
  const onHand = Number(pos.quantity_on_hand) + qty
  const reserved = restoreReserved
    ? Number(pos.quantity_reserved) + qty
    : Number(pos.quantity_reserved)
  const available = computeAvailableQuantity(onHand)
  const minStock = Number(pos.min_stock ?? 0)
  const previousStatus = pos.status ?? 'En stock'
  const status = deriveOperationalInventoryStatus(
    onHand,
    reserved,
    minStock,
    pos.status,
  )

  await client.query(
    `UPDATE crm_inventory_positions SET
      quantity_on_hand = $2,
      quantity_reserved = $3,
      quantity_available = $4,
      status = $5,
      last_movement_at = now(),
      updated_at = now()
    WHERE id = $1`,
    [pos.id, onHand, reserved, available, status],
  )

  void maybeNotifyInventoryStatusChange({
    actor,
    inventoryPositionId: pos.id,
    productName: pos.product_name,
    warehouseName: pos.warehouse_name ?? '',
    sku: pos.sku,
    previousStatus,
    nextStatus: status,
  }).catch(() => {
    /* ignore realtime errors */
  })

  return {
    ...pos,
    quantity_on_hand: onHand,
    quantity_reserved: reserved,
    quantity_available: available,
    status,
  }
}

/** Salidas huérfanas (sin fila committed) al volver a borrador. */
async function revertOrphanInvoiceSalidas(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  quoteId: string | null,
  actor: AuditActor,
): Promise<boolean> {
  const salidaBySku = await loadInvoiceSalidaQtyBySku(client, invoiceId)
  if (salidaBySku.size === 0) return false

  let changed = false
  for (const [skuKey, qty] of salidaBySku) {
    if (qty <= 0) continue
    const pos = await lockInventoryBySku(client, skuKey)
    if (!pos) continue

    await applyInventoryAfterInvoiceRevert(
      client,
      pos,
      qty,
      Boolean(quoteId),
      actor,
    )

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Entrada', $5, $6, $7, $8, $9, 'factura', $10)`,
      [
        pos.id,
        pos.product_id,
        pos.product_name,
        pos.sku,
        `Revertir emisión ${invoiceNumber}`,
        qty,
        quoteId ? qty : 0,
        actor.userId,
        actor.userName,
        invoiceId,
      ],
    )
    changed = true
  }

  await deleteInvoiceSalidaMovements(client, invoiceId)
  return changed
}

/** Cotización vinculada: la reserva vuelve a estar activa en la COT, no se pierde al borrador. */
async function reactivateQuoteReservationAfterDraft(
  client: PoolClient,
  reservationId: string,
  quoteId: string,
): Promise<void> {
  await client.query(
    `UPDATE crm_stock_reservations SET
      status = 'active',
      invoice_id = NULL,
      invoice_number = '',
      quote_id = COALESCE(quote_id, $2)
    WHERE id = $1`,
    [reservationId, quoteId],
  )
}

function linesFullyDeductedFromSalidaMap(
  lines: { sku: string; quantity: number }[],
  salidaBySku: Map<string, number>,
): boolean {
  if (lines.length === 0) return false
  for (const line of lines) {
    const deducted = salidaBySku.get(line.sku.trim().toLowerCase()) ?? 0
    if (deducted + 1e-6 < line.quantity) return false
  }
  return true
}

async function invoiceStockCommitIsComplete(
  client: PoolClient,
  invoiceId: string,
  quoteId: string | null,
  lines: { sku: string; quantity: number }[],
  salidaBySku: Map<string, number>,
): Promise<boolean> {
  const pending = await loadPendingReservationsForInvoiceCommit(
    client,
    invoiceId,
    quoteId,
  )
  if (pending.length > 0) return false

  const committed = await client.query<{ ok: string }>(
    `SELECT 1 AS ok
     FROM crm_stock_reservations
     WHERE invoice_id = $1 AND status = 'committed'
     LIMIT 1`,
    [invoiceId],
  )
  if (committed.rows.length > 0) return true

  if (lines.length === 0) return true

  return linesFullyDeductedFromSalidaMap(lines, salidaBySku)
}

/** Libera reservas cuando la salida de bodega ya se registró pero quedó reservado pendiente. */
async function finalizeInvoiceReservationsOnly(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  actor: AuditActor,
  reservations: InvoiceReservationRow[],
): Promise<void> {
  for (const res of reservations) {
    const qty = Number(res.qty)
    const posResult = await client.query<InventoryPositionRow>(
      `SELECT ${POSITION_COLUMNS}
       FROM crm_inventory_positions
       WHERE id = $1
       FOR UPDATE`,
      [res.inventory_position_id],
    )
    const pos = posResult.rows[0]
    if (!pos) continue

    const onHand = Number(pos.quantity_on_hand)
    const reserved = Math.max(0, Number(pos.quantity_reserved) - qty)
    const available = computeAvailableQuantity(onHand)
    const minStock = Number(pos.min_stock ?? 0)
    const previousStatus = pos.status ?? 'En stock'
    const status = deriveOperationalInventoryStatus(
      onHand,
      reserved,
      minStock,
      pos.status,
    )

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_reserved = $2,
        quantity_available = $3,
        status = $4,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, reserved, available, status],
    )

    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: pos.id,
      productName: pos.product_name,
      warehouseName: pos.warehouse_name ?? '',
      sku: pos.sku,
      previousStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Liberación', $5, 0, $6, $7, $8, 'factura', $9)`,
      [
        pos.id,
        res.product_id,
        res.product_name,
        res.sku,
        `Emitida ${invoiceNumber}`,
        -qty,
        actor.userId,
        actor.userName,
        invoiceId,
      ],
    )

    await client.query(
      `UPDATE crm_stock_reservations SET
        status = 'committed',
        invoice_id = COALESCE(invoice_id, $2),
        invoice_number = COALESCE(invoice_number, $3)
      WHERE id = $1`,
      [res.id, invoiceId, invoiceNumber],
    )
  }
}

async function releaseQuoteReservationsForInvoiceLines(
  client: PoolClient,
  quoteId: string,
  invoiceId: string,
  invoiceNumber: string,
  actor: AuditActor,
  lines: { sku: string; product_name: string; quantity: number }[],
): Promise<void> {
  for (const line of lines) {
    const pending = await client.query<InvoiceReservationRow>(
      `SELECT id, inventory_position_id, product_id, product_name, sku, qty
       FROM crm_stock_reservations
       WHERE quote_id = $1
         AND status IN ('active', 'transferred')
         AND lower(trim(sku)) = lower(trim($2))`,
      [quoteId, line.sku],
    )

    for (const res of pending.rows) {
      const qty = Number(res.qty)
      const posResult = await client.query<InventoryPositionRow>(
        `SELECT ${POSITION_COLUMNS}
         FROM crm_inventory_positions
         WHERE id = $1
         FOR UPDATE`,
        [res.inventory_position_id],
      )
      const pos = posResult.rows[0]
      if (!pos) continue

      const onHand = Number(pos.quantity_on_hand)
      const reserved = Math.max(0, Number(pos.quantity_reserved) - qty)
      const available = computeAvailableQuantity(onHand)
      const minStock = Number(pos.min_stock ?? 0)
      const previousStatus = pos.status ?? 'En stock'
      const status = deriveOperationalInventoryStatus(
        onHand,
        reserved,
        minStock,
        pos.status,
      )

      await client.query(
        `UPDATE crm_inventory_positions SET
          quantity_reserved = $2,
          quantity_available = $3,
          status = $4,
          last_movement_at = now(),
          updated_at = now()
        WHERE id = $1`,
        [pos.id, reserved, available, status],
      )

      void maybeNotifyInventoryStatusChange({
        actor,
        inventoryPositionId: pos.id,
        productName: pos.product_name,
        warehouseName: pos.warehouse_name ?? '',
        sku: pos.sku,
        previousStatus,
        nextStatus: status,
      }).catch(() => {
        /* ignore realtime errors */
      })

      await client.query(
        `INSERT INTO crm_stock_movements (
          inventory_position_id, product_id, product_name, sku,
          movement_type, reference, quantity_delta, reserved_delta,
          author_user_id, author_name, source_kind, source_id
        ) VALUES ($1, $2, $3, $4, 'Liberación', $5, 0, $6, $7, $8, 'factura', $9)`,
        [
          pos.id,
          res.product_id,
          res.product_name,
          res.sku,
          `Emitida ${invoiceNumber}`,
          -qty,
          actor.userId,
          actor.userName,
          invoiceId,
        ],
      )

      await client.query(
        `UPDATE crm_stock_reservations SET
          status = 'committed',
          invoice_id = COALESCE(invoice_id, $2),
          invoice_number = COALESCE(invoice_number, $3)
        WHERE id = $1`,
        [res.id, invoiceId, invoiceNumber],
      )
    }
  }
}

async function commitStockFromInvoiceLines(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  actor: AuditActor,
): Promise<void> {
  const quoteId = await loadInvoiceQuoteId(client, invoiceId)
  let lines = await loadInvoiceLinesForStock(client, invoiceId)
  lines = await filterLinesRequiringStockControl(client, lines)
  if (lines.length === 0) return

  if (quoteId) {
    await releaseQuoteReservationsForInvoiceLines(
      client,
      quoteId,
      invoiceId,
      invoiceNumber,
      actor,
      lines,
    )
  }

  for (const line of lines) {
    const pos = await lockInventoryBySku(client, line.sku)
    if (!pos) {
      throw badRequest(
        `No hay inventario para SKU ${line.sku} al facturar.`,
      )
    }

    const qty = line.quantity
    const onHand = Math.max(0, Number(pos.quantity_on_hand) - qty)
    const reserved = Math.max(0, Number(pos.quantity_reserved) - qty)
    const available = computeAvailableQuantity(onHand)
    const minStock = Number(pos.min_stock ?? 0)
    const previousStatus = pos.status ?? 'En stock'
    const status = deriveOperationalInventoryStatus(
      onHand,
      reserved,
      minStock,
      pos.status,
    )

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_on_hand = $2,
        quantity_reserved = $3,
        quantity_available = $4,
        status = $5,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, onHand, reserved, available, status],
    )

    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: pos.id,
      productName: pos.product_name,
      warehouseName: pos.warehouse_name ?? '',
      sku: pos.sku,
      previousStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Salida', $5, $6, $7, $8, $9, 'factura', $10)`,
      [
        pos.id,
        pos.product_id,
        line.product_name,
        line.sku,
        `FAC ${invoiceNumber}`,
        -qty,
        -qty,
        actor.userId,
        actor.userName,
        invoiceId,
      ],
    )
  }
}

export async function commitStockForInvoice(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  actor: AuditActor,
): Promise<boolean> {
  const quoteId = await loadInvoiceQuoteId(client, invoiceId)
  const lines = await loadInvoiceLinesForStock(client, invoiceId)
  await acquireSkuStockLocksOrdered(
    client,
    lines.map((line) => line.sku),
  )
  const salidaBySku = await loadInvoiceSalidaQtyBySku(client, invoiceId)

  if (
    await invoiceStockCommitIsComplete(
      client,
      invoiceId,
      quoteId,
      lines,
      salidaBySku,
    )
  ) {
    await reconcileInventoryForSkus(
      client,
      lines.map((line) => line.sku),
      actor,
    )
    return false
  }

  let reservations = await filterReservationsRequiringStockControl(
    client,
    await loadPendingReservationsForInvoiceCommit(client, invoiceId, quoteId),
  )

  if (reservations.length > 0) {
    await removeOrphanInvoiceSalidaMovements(client, invoiceId)
    salidaBySku.clear()
    for (const [sku, qty] of await loadInvoiceSalidaQtyBySku(client, invoiceId)) {
      salidaBySku.set(sku, qty)
    }
    reservations = await filterReservationsRequiringStockControl(
      client,
      await loadPendingReservationsForInvoiceCommit(client, invoiceId, quoteId),
    )
  }

  const stockLines = await filterLinesRequiringStockControl(client, lines)
  const stockAlreadyDeducted = linesFullyDeductedFromSalidaMap(
    stockLines,
    salidaBySku,
  )

  if (stockAlreadyDeducted && reservations.length > 0) {
    await finalizeInvoiceReservationsOnly(
      client,
      invoiceId,
      invoiceNumber,
      actor,
      reservations,
    )
    await reconcileInventoryForSkus(
      client,
      [
        ...lines.map((line) => line.sku),
        ...reservations.map((r) => r.sku),
      ],
      actor,
    )
    return true
  }

  await assertInvoiceStockAvailableForCommit(client, invoiceId)

  if (reservations.length === 0) {
    await commitStockFromInvoiceLines(client, invoiceId, invoiceNumber, actor)
    await reconcileInventoryForSkus(
      client,
      lines.map((line) => line.sku),
      actor,
    )
    return true
  }

  for (const res of reservations) {
    const qty = Number(res.qty)
    const posResult = await client.query<InventoryPositionRow>(
      `SELECT ${POSITION_COLUMNS}
       FROM crm_inventory_positions
       WHERE id = $1
       FOR UPDATE`,
      [res.inventory_position_id],
    )
    const pos = posResult.rows[0]
    if (!pos) continue

    const onHand = Math.max(0, Number(pos.quantity_on_hand) - qty)
    const reserved = Math.max(0, Number(pos.quantity_reserved) - qty)
    const available = computeAvailableQuantity(onHand)
    const minStock = Number(pos.min_stock ?? 0)
    const previousStatus = pos.status ?? 'En stock'
    const status = deriveOperationalInventoryStatus(
      onHand,
      reserved,
      minStock,
      pos.status,
    )

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_on_hand = $2,
        quantity_reserved = $3,
        quantity_available = $4,
        status = $5,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, onHand, reserved, available, status],
    )

    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: pos.id,
      productName: pos.product_name,
      warehouseName: pos.warehouse_name ?? '',
      sku: pos.sku,
      previousStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Salida', $5, $6, $7, $8, $9, 'factura', $10)`,
      [
        pos.id,
        res.product_id,
        res.product_name,
        res.sku,
        `FAC ${invoiceNumber}`,
        -qty,
        -qty,
        actor.userId,
        actor.userName,
        invoiceId,
      ],
    )

    await client.query(
      `UPDATE crm_stock_reservations SET
        status = 'committed',
        invoice_id = COALESCE(invoice_id, $2),
        invoice_number = COALESCE(invoice_number, $3)
      WHERE id = $1`,
      [res.id, invoiceId, invoiceNumber],
    )
  }

  await reconcileInventoryForSkus(
    client,
    [
      ...lines.map((line) => line.sku),
      ...reservations.map((r) => r.sku),
    ],
    actor,
  )

  return true
}

/** Restaura inventario al volver a borrador o anular (revierte salidas y reactiva reservas de cotización). */
export async function revertStockForInvoice(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  actor: AuditActor,
): Promise<boolean> {
  const quoteId = await loadInvoiceQuoteId(client, invoiceId)
  const invoiceLines = await loadInvoiceLinesForStock(client, invoiceId)
  let changed = false

  const committed = await client.query<ReservationRevertRow>(
    `SELECT id, inventory_position_id, product_id, product_name, sku, qty, quote_id
     FROM crm_stock_reservations
     WHERE invoice_id = $1 AND status = 'committed'`,
    [invoiceId],
  )

  const skusToLock = new Set<string>(invoiceLines.map((l) => l.sku))
  for (const row of committed.rows) skusToLock.add(row.sku.trim())
  for (const row of (
    await client.query<{ sku: string }>(
      `SELECT sku FROM crm_stock_reservations
       WHERE invoice_id = $1 AND status IN ('active', 'transferred', 'released')`,
      [invoiceId],
    )
  ).rows) {
    skusToLock.add(row.sku.trim())
  }
  await acquireSkuStockLocksOrdered(client, [...skusToLock])

  for (const res of committed.rows) {
    const qty = Number(res.qty)
    await acquireSkuStockLock(client, res.sku)
    const posResult = await client.query<InventoryPositionRow>(
      `SELECT ${POSITION_COLUMNS}
       FROM crm_inventory_positions
       WHERE id = $1
       FOR UPDATE`,
      [res.inventory_position_id],
    )
    const pos = posResult.rows[0]
    if (!pos) continue

    const linkedQuoteId = res.quote_id?.trim() || quoteId
    const restoreReserved = Boolean(linkedQuoteId)

    await applyInventoryAfterInvoiceRevert(
      client,
      pos,
      qty,
      restoreReserved,
      actor,
    )

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Entrada', $5, $6, $7, $8, $9, 'factura', $10)`,
      [
        pos.id,
        res.product_id,
        res.product_name,
        res.sku,
        `Revertir emisión ${invoiceNumber}`,
        qty,
        restoreReserved ? qty : 0,
        actor.userId,
        actor.userName,
        invoiceId,
      ],
    )

    if (linkedQuoteId) {
      await reactivateQuoteReservationAfterDraft(client, res.id, linkedQuoteId)
    } else {
      await client.query(
        `UPDATE crm_stock_reservations SET status = 'released' WHERE id = $1`,
        [res.id],
      )
    }
    changed = true
  }

  const pending = await client.query<ReservationRevertRow>(
    `SELECT id, inventory_position_id, product_id, product_name, sku, qty, quote_id
     FROM crm_stock_reservations
     WHERE invoice_id = $1 AND status IN ('active', 'transferred')`,
    [invoiceId],
  )

  for (const res of pending.rows) {
    const linkedQuoteId = res.quote_id?.trim() || quoteId
    if (linkedQuoteId) {
      await reactivateQuoteReservationAfterDraft(client, res.id, linkedQuoteId)
      changed = true
      continue
    }

    const qty = Number(res.qty)
    const posResult = await client.query<InventoryPositionRow>(
      `SELECT ${POSITION_COLUMNS}
       FROM crm_inventory_positions
       WHERE id = $1
       FOR UPDATE`,
      [res.inventory_position_id],
    )
    const pos = posResult.rows[0]
    if (!pos) continue

    const reserved = Math.max(0, Number(pos.quantity_reserved) - qty)
    const available = computeAvailableQuantity(Number(pos.quantity_on_hand))
    const minStock = Number(pos.min_stock ?? 0)
    const previousStatus = pos.status ?? 'En stock'
    const status = deriveOperationalInventoryStatus(
      Number(pos.quantity_on_hand),
      reserved,
      minStock,
      pos.status,
    )

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_reserved = $2,
        quantity_available = $3,
        status = $4,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [pos.id, reserved, available, status],
    )

    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: pos.id,
      productName: pos.product_name,
      warehouseName: pos.warehouse_name ?? '',
      sku: pos.sku,
      previousStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Liberación', $5, 0, $6, $7, $8, 'factura', $9)`,
      [
        pos.id,
        res.product_id,
        res.product_name,
        res.sku,
        `Revertir emisión ${invoiceNumber}`,
        -qty,
        actor.userId,
        actor.userName,
        invoiceId,
      ],
    )

    await client.query(
      `UPDATE crm_stock_reservations SET status = 'released' WHERE id = $1`,
      [res.id],
    )
    changed = true
  }

  // Reservas marcadas released en reversiones anteriores (antes del fix).
  if (quoteId) {
    const released = await client.query<ReservationRevertRow>(
      `SELECT id, inventory_position_id, product_id, product_name, sku, qty, quote_id
       FROM crm_stock_reservations
       WHERE invoice_id = $1 AND status = 'released' AND quote_id = $2`,
      [invoiceId, quoteId],
    )
    for (const res of released.rows) {
      const qty = Number(res.qty)
      const posResult = await client.query<InventoryPositionRow>(
        `SELECT ${POSITION_COLUMNS}
         FROM crm_inventory_positions
         WHERE id = $1
         FOR UPDATE`,
        [res.inventory_position_id],
      )
      const pos = posResult.rows[0]
      if (!pos) continue

      const reserved = Number(pos.quantity_reserved) + qty
      const onHand = Number(pos.quantity_on_hand)
      const available = computeAvailableQuantity(onHand)
      const minStock = Number(pos.min_stock ?? 0)
      const previousStatus = pos.status ?? 'En stock'
      const status = deriveOperationalInventoryStatus(
        onHand,
        reserved,
        minStock,
        pos.status,
      )

      await client.query(
        `UPDATE crm_inventory_positions SET
          quantity_reserved = $2,
          quantity_available = $3,
          status = $4,
          last_movement_at = now(),
          updated_at = now()
        WHERE id = $1`,
        [pos.id, reserved, available, status],
      )

      void maybeNotifyInventoryStatusChange({
        actor,
        inventoryPositionId: pos.id,
        productName: pos.product_name,
        warehouseName: pos.warehouse_name ?? '',
        sku: pos.sku,
        previousStatus,
        nextStatus: status,
      }).catch(() => {
        /* ignore realtime errors */
      })

      await reactivateQuoteReservationAfterDraft(client, res.id, quoteId)
      changed = true
    }
  }

  const salidaBySku = await loadInvoiceSalidaQtyBySku(client, invoiceId)
  if (salidaBySku.size > 0) {
    if (committed.rows.length === 0 && pending.rows.length === 0) {
      changed =
        (await revertOrphanInvoiceSalidas(
          client,
          invoiceId,
          invoiceNumber,
          quoteId,
          actor,
        )) || changed
    } else {
      await deleteInvoiceSalidaMovements(client, invoiceId)
      changed = true
    }
  }

  await reconcileInventoryForSkus(client, skusToLock, actor)

  return changed
}

export async function syncInvoiceStockOnStatusChange(
  client: PoolClient,
  invoiceId: string,
  invoiceNumber: string,
  previousStatus: string,
  nextStatus: string,
  actor: AuditActor,
): Promise<boolean> {
  const wasDraft = previousStatus === 'Borrador'
  const isDraft = nextStatus === 'Borrador'
  const isVoid = nextStatus === 'Anulada'
  const wasVoid = previousStatus === 'Anulada'

  if (isVoid) {
    return revertStockForInvoice(client, invoiceId, invoiceNumber, actor)
  }

  if (wasVoid && !isDraft) {
    if (nextStatus === 'Pendiente' || nextStatus === 'Pagada') {
      return commitStockForInvoice(client, invoiceId, invoiceNumber, actor)
    }
    return false
  }

  if (wasDraft && nextStatus === 'Pendiente') {
    return commitStockForInvoice(client, invoiceId, invoiceNumber, actor)
  }

  if (nextStatus === 'Pagada' && !isDraft) {
    return commitStockForInvoice(client, invoiceId, invoiceNumber, actor)
  }

  if (wasDraft && nextStatus === 'Pagada') {
    return commitStockForInvoice(client, invoiceId, invoiceNumber, actor)
  }

  if (!wasDraft && isDraft) {
    return revertStockForInvoice(client, invoiceId, invoiceNumber, actor)
  }

  return false
}
