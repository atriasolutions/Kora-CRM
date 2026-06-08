import { acquireSkuStockLock } from '../lib/inventory-stock-lock.js'
import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapInventoryDetail,
  mapInventoryRow,
  deriveInventoryStatus,
  type InventoryRow,
  type StockMovementRow,
} from '../mappers/inventory.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  AdjustInventoryInput,
  InventoryDetail,
  InventoryListItem,
  UpdateInventoryInput,
} from '../types/inventory.js'
import { maybeNotifyInventoryStatusChange } from '../services/notifications.service.js'
import { computeAvailableQuantity } from '../lib/inventory-quantity.js'
import { paginationOffset } from '../utils/pagination.js'

/** Columnas de posición sin join (UPDATE, FOR UPDATE, etc.). */
const POSITION_BASE_COLUMNS = `
  id, product_id, product_name, sku, warehouse_id, warehouse_name,
  quantity_on_hand, quantity_reserved, quantity_available, min_stock,
  status, last_movement_at, created_at, updated_at
`

const POSITION_COLUMNS = `
  ip.id, ip.product_id, ip.product_name, ip.sku, ip.warehouse_id, ip.warehouse_name,
  ip.quantity_on_hand, ip.quantity_reserved, ip.quantity_available, ip.min_stock,
  ip.status, ip.last_movement_at, ip.created_at, ip.updated_at,
  c.name AS product_category_name,
  COALESCE(NULLIF(trim(pr.owner_name), ''), pr.created_by_name) AS product_owner_name,
  pr.cost_price_cents AS product_cost_price_cents
`

const POSITION_FROM = `
  FROM crm_inventory_positions ip
  LEFT JOIN crm_products pr ON pr.id = ip.product_id
  LEFT JOIN crm_product_categories c ON c.id = pr.category_id
`

const MOVEMENT_COLUMNS = `
  id, inventory_position_id, movement_type, reference,
  quantity_delta, occurred_at, author_name, source_kind, source_id
`

export type ListInventoryParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  warehouseId?: string
}

async function loadMovements(positionId: string): Promise<StockMovementRow[]> {
  const result = await tenantQuery<StockMovementRow>(
    `SELECT ${MOVEMENT_COLUMNS}
     FROM crm_stock_movements
     WHERE inventory_position_id = $1
     ORDER BY occurred_at DESC
     LIMIT 50`,
    [positionId],
  )
  return result.rows
}

export async function listInventory(
  params: ListInventoryParams,
): Promise<{ items: InventoryListItem[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  idx = pushTenantCondition(conditions, values, idx, 'ip')
  if (params.status) {
    conditions.push(`ip.status = $${idx++}`)
    values.push(params.status)
  }
  if (params.warehouseId) {
    conditions.push(`ip.warehouse_id = $${idx++}`)
    values.push(params.warehouseId)
  }
  if (params.q) {
    conditions.push(
      `(ip.sku ILIKE $${idx} OR ip.product_name ILIKE $${idx} OR ip.warehouse_name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_inventory_positions ip ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await tenantQuery<InventoryRow>(
    `SELECT ${POSITION_COLUMNS}
     ${POSITION_FROM}
     ${where}
     ORDER BY ip.updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return { items: result.rows.map(mapInventoryRow), total }
}

export async function getInventoryById(id: string): Promise<InventoryDetail> {
  const result = await tenantQuery<InventoryRow>(
    `SELECT ${POSITION_COLUMNS} ${POSITION_FROM} WHERE ip.id = $1 AND ${tenantWhereParam(2, 'ip')}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Posición de inventario no encontrada')
  const movements = await loadMovements(id)
  return mapInventoryDetail(row, movements)
}

export async function updateInventory(
  id: string,
  input: UpdateInventoryInput,
  actor: AuditActor,
): Promise<InventoryDetail> {
  const existing = await getInventoryById(id)
  const prevStatus = existing.status
  const onHand = input.quantityNum ?? existing.onHandQtyNum
  const minStock = input.minStockNum ?? existing.minStockNum
  const reserved = existing.reservedQtyNum
  const available = computeAvailableQuantity(onHand)
  const status =
    input.status ??
    deriveInventoryStatus(onHand, reserved, minStock, existing.status)

  const result = await tenantQuery<{ id: string }>(
    `UPDATE crm_inventory_positions SET
      quantity_on_hand = $2,
      quantity_available = $3,
      min_stock = $4,
      status = $5,
      updated_at = now()
    WHERE id = $1 AND ${tenantWhereParam(6)}
    RETURNING id`,
    [id, onHand, available, minStock, status, getTenantIdOrDefault()],
  )
  if (!result.rows[0]) throw notFound('Posición de inventario no encontrada')
  const updated = await getInventoryById(id)

  if (prevStatus !== status) {
    void maybeNotifyInventoryStatusChange({
      actor,
      inventoryPositionId: id,
      productName: existing.productName,
      warehouseName: existing.location,
      sku: existing.sku,
      previousStatus: prevStatus,
      nextStatus: status,
    }).catch(() => {
      /* ignore realtime errors */
    })
  }

  return updated
}

export async function adjustInventory(
  id: string,
  input: AdjustInventoryInput,
  actor: AuditActor,
): Promise<InventoryDetail> {
  const delta = input.quantityDelta
  if (!Number.isFinite(delta) || delta === 0) {
    throw badRequest('Indica un ajuste distinto de cero')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    const posResult = await client.query<InventoryRow>(
      `SELECT ${POSITION_BASE_COLUMNS}
       FROM crm_inventory_positions
       WHERE id = $1
       FOR UPDATE`,
      [id],
    )
    const row = posResult.rows[0]
    if (!row) throw notFound('Posición de inventario no encontrada')

    await acquireSkuStockLock(client, row.sku)

    const onHand = Math.max(0, Number(row.quantity_on_hand) + delta)
    const reserved = Number(row.quantity_reserved)
    const available = computeAvailableQuantity(onHand)
    const minStock = Number(row.min_stock ?? 0)
    const status = deriveInventoryStatus(onHand, reserved, minStock, row.status)

    await client.query(
      `UPDATE crm_inventory_positions SET
        quantity_on_hand = $2,
        quantity_available = $3,
        status = $4,
        last_movement_at = now(),
        updated_at = now()
      WHERE id = $1`,
      [id, onHand, available, status],
    )

    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, adjustment_detail
      ) VALUES ($1, $2, $3, $4, 'Ajuste', $5, $6, 0, $7, $8, 'ajuste', $9)`,
      [
        id,
        row.product_id,
        row.product_name,
        row.sku,
        input.note?.trim() || 'Ajuste manual',
        delta,
        actor.userId,
        actor.userName,
        JSON.stringify({
          quantityBefore: Number(row.quantity_on_hand),
          quantityAfter: onHand,
          quantityDelta: delta,
        }),
      ],
    )

    await client.query('COMMIT')
    const updatedDetail = await getInventoryById(id)

    if (row.status !== status) {
      void maybeNotifyInventoryStatusChange({
        actor,
        inventoryPositionId: id,
        productName: row.product_name,
        warehouseName: row.warehouse_name,
        sku: row.sku,
        previousStatus: row.status,
        nextStatus: status,
      }).catch(() => {
        /* ignore realtime errors */
      })
    }

    return updatedDetail
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
