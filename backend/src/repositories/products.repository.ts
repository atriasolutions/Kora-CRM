import type { PoolClient } from 'pg'

import { pool } from '../db/pool.js'
import { deriveInventoryStatus } from '../mappers/inventory.mapper.js'
import { mapProductDetail, mapProductRow, type ProductRow } from '../mappers/product.mapper.js'
import { maybeNotifyRecordOwnerChange } from '../lib/owner-assignment.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type {
  CreateProductInput,
  ProductListItem,
  UpdateProductInput,
} from '../types/product.js'
import { normalizeProductCurrency } from '../types/currency.js'
import { paginationOffset } from '../utils/pagination.js'
import { purgeEntityNotesAndFiles } from '../services/entity-purge.service.js'

const SELECT_COLUMNS = `
  p.id, p.name, p.sku, c.name AS category_name, p.product_type, p.unit_of_measure,
  p.billing_period,
  p.price_cents, p.price_currency, p.price_amount, p.cost_price_cents,
  CASE
    WHEN p.track_inventory THEN COALESCE(FLOOR(inv.total_on_hand), 0)::int
    ELSE p.stock_qty
  END AS stock_qty,
  p.status, p.track_inventory,
  p.barcode, p.image_url,
  p.created_at, p.created_by_id, p.created_by_name, p.owner_name,
  p.updated_at, p.updated_by_id, p.updated_by_name
`

const FROM_JOIN = `
  FROM crm_products p
  LEFT JOIN crm_product_categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(ip.quantity_on_hand), 0) AS total_on_hand
    FROM crm_inventory_positions ip
    WHERE ip.product_id = p.id
       OR lower(trim(ip.sku)) = lower(trim(p.sku))
  ) inv ON true
`

export type ListProductsParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  archivedOnly?: boolean
}

async function resolveCategoryId(categoryName?: string): Promise<string | null> {
  const name = categoryName?.trim()
  if (!name) return null
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM crm_product_categories WHERE lower(trim(name)) = lower($1) AND active = true LIMIT 1`,
    [name],
  )
  if (existing.rows[0]) return existing.rows[0].id
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO crm_product_categories (name, active) VALUES ($1, true) RETURNING id`,
    [name],
  )
  return inserted.rows[0]?.id ?? null
}

function toCents(amount?: number): number {
  if (amount == null || Number.isNaN(amount)) return 0
  return Math.round(amount * 100)
}

function priceFieldsFromInput(input: {
  priceNum?: number
  priceCurrency?: string
}): { priceCents: number; priceAmount: number; priceCurrency: string } {
  const priceCurrency = normalizeProductCurrency(input.priceCurrency)
  const priceAmount = input.priceNum ?? 0
  const priceCents = priceCurrency === 'CLP' ? toCents(priceAmount) : 0
  return { priceCents, priceAmount, priceCurrency }
}

async function resolveDefaultWarehouse(
  client: PoolClient,
): Promise<{ id: string | null; name: string }> {
  const result = await client.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM crm_warehouses
     WHERE deleted_at IS NULL AND active = true
     ORDER BY is_default DESC, name ASC
     LIMIT 1`,
  )
  const row = result.rows[0]
  return { id: row?.id ?? null, name: row?.name ?? 'Bodega central' }
}

/** Crea la posición de inventario inicial al dar de alta un producto con control de stock. */
async function ensureInventoryPositionForNewProduct(
  client: PoolClient,
  params: {
    productId: string
    productName: string
    sku: string
    onHand: number
    minStock: number
    actor: AuditActor
  },
): Promise<void> {
  const warehouse = await resolveDefaultWarehouse(client)
  const sku = params.sku.trim()
  const onHand = Math.max(0, params.onHand)
  const minStock = Math.max(0, params.minStock)
  const available = onHand
  const status = deriveInventoryStatus(onHand, 0, minStock, null)

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM crm_inventory_positions
     WHERE lower(trim(sku)) = lower($1)
       AND warehouse_id IS NOT DISTINCT FROM $2
     LIMIT 1`,
    [sku, warehouse.id],
  )
  if (existing.rows[0]) return

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO crm_inventory_positions (
      product_id, product_name, sku, warehouse_id, warehouse_name,
      quantity_on_hand, quantity_reserved, quantity_available, min_stock, status,
      last_movement_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, now())
    RETURNING id`,
    [
      params.productId,
      params.productName.trim(),
      sku,
      warehouse.id,
      warehouse.name,
      onHand,
      available,
      minStock,
      status,
    ],
  )
  const positionId = inserted.rows[0]!.id

  if (onHand > 0) {
    await client.query(
      `INSERT INTO crm_stock_movements (
        inventory_position_id, product_id, product_name, sku,
        movement_type, reference, quantity_delta, reserved_delta,
        author_user_id, author_name, source_kind, source_id
      ) VALUES ($1, $2, $3, $4, 'Entrada', $5, $6, 0, $7, $8, 'producto', $9)`,
      [
        positionId,
        params.productId,
        params.productName.trim(),
        sku,
        'Alta de producto',
        onHand,
        params.actor.userId,
        params.actor.userName,
        params.productId,
      ],
    )
  }
}

export async function listProducts(
  params: ListProductsParams,
): Promise<{ items: ProductListItem[]; total: number }> {
  const conditions: string[] = ['p.deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  if (params.archivedOnly) {
    conditions.push('p.archived_at IS NOT NULL')
  } else {
    conditions.push('p.archived_at IS NULL')
  }
  if (params.status) {
    conditions.push(`p.status = $${idx++}`)
    values.push(params.status)
  }
  if (params.q) {
    conditions.push(
      `(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR c.name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count ${FROM_JOIN} ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

  const offset = paginationOffset(params.page, params.pageSize)
  values.push(params.pageSize, offset)

  const result = await pool.query<ProductRow>(
    `SELECT ${SELECT_COLUMNS}
     ${FROM_JOIN}
     ${where}
     ORDER BY p.updated_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values,
  )

  return { items: result.rows.map(mapProductRow), total }
}

export async function getProductById(id: string): Promise<ProductListItem> {
  const result = await pool.query<ProductRow>(
    `SELECT ${SELECT_COLUMNS}
     ${FROM_JOIN}
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Producto no encontrado')
  return mapProductDetail(row)
}

async function assertSkuAvailable(
  sku: string,
  excludeProductId?: string,
  client?: PoolClient,
): Promise<void> {
  const trimmed = sku.trim()
  if (!trimmed) return

  const db = client ?? pool
  const result = await db.query<{ id: string; name: string }>(
    `SELECT id, name
     FROM crm_products
     WHERE lower(trim(sku)) = lower($1)
       AND deleted_at IS NULL
       ${excludeProductId ? 'AND id <> $2' : ''}
     LIMIT 1`,
    excludeProductId ? [trimmed, excludeProductId] : [trimmed],
  )
  const row = result.rows[0]
  if (row) {
    throw badRequest(
      `Ya existe un producto con el SKU «${trimmed}» (${row.name})`,
    )
  }
}

export async function createProduct(
  input: CreateProductInput,
  actor: AuditActor,
): Promise<ProductListItem> {
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')
  if (!input.sku?.trim()) throw badRequest('El SKU es obligatorio')

  const categoryId = await resolveCategoryId(input.category)
  const trackInventory = input.trackInventory ?? true
  const stockQty =
    trackInventory && input.stockNum != null ? input.stockNum : null
  const onHand = trackInventory ? Math.max(0, stockQty ?? 0) : 0
  const minStock = trackInventory ? Math.max(0, input.minStock ?? 0) : 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Si algún "eliminación permanente" anterior terminó haciendo solo soft-delete,
    // la fila queda en BD y bloquea el UNIQUE(sku). Limpiamos esas filas ya
    // soft-borradas antes de insertar para permitir reutilizar el SKU.
    await client.query(
      `DELETE FROM crm_products
       WHERE lower(trim(sku)) = lower($1) AND deleted_at IS NOT NULL`,
      [input.sku.trim()],
    )

    await assertSkuAvailable(input.sku.trim(), undefined, client)

    const priceFields = priceFieldsFromInput(input)

    const result = await client.query<{ id: string }>(
      `INSERT INTO crm_products (
        name, sku, category_id, product_type, unit_of_measure, billing_period,
        price_cents, price_currency, price_amount, cost_price_cents, stock_qty, status, track_inventory,
        min_stock, max_stock, barcode, image_url,
        created_by_id, created_by_name, owner_name, updated_by_id, updated_by_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $18, $19
      ) RETURNING id`,
      [
        input.name.trim(),
        input.sku.trim(),
        categoryId,
        input.productType?.trim() || 'Producto',
        input.unitOfMeasure?.trim() || 'ud',
        input.billingPeriod?.trim() || null,
        priceFields.priceCents,
        priceFields.priceCurrency,
        priceFields.priceAmount,
        input.costPriceNum != null ? toCents(input.costPriceNum) : null,
        stockQty,
        input.status ?? 'Activo',
        trackInventory,
        trackInventory ? minStock : null,
        input.maxStock ?? null,
        input.barcode?.trim() || null,
        input.imageUrl?.trim() || null,
        actor.userId,
        actor.userName,
        input.ownerName?.trim() || actor.userName,
      ],
    )
    const productId = result.rows[0]!.id

    if (trackInventory) {
      await ensureInventoryPositionForNewProduct(client, {
        productId,
        productName: input.name.trim(),
        sku: input.sku.trim(),
        onHand,
        minStock,
        actor,
      })
    }

    await client.query('COMMIT')
    return getProductById(productId)
  } catch (err) {
    await client.query('ROLLBACK')
    // Si el SKU ya existe en un producto "activo" (deleted_at IS NULL),
    // la restricción UNIQUE(sku) falla y queremos devolver un 400 claro.
    if (err && typeof err === 'object' && 'code' in err && (err as any).code === '23505') {
      throw badRequest('Ya existe un producto con ese SKU')
    }
    throw err
  } finally {
    client.release()
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  actor: AuditActor,
): Promise<ProductListItem> {
  const existing = await getProductById(id)
  const previousOwner = existing.owner ?? ''

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (input.name !== undefined) {
    sets.push(`name = $${idx++}`)
    values.push(input.name.trim())
  }
  if (input.sku !== undefined) {
    const nextSku = input.sku.trim()
    if (nextSku.toLowerCase() !== existing.sku.trim().toLowerCase()) {
      await assertSkuAvailable(nextSku, id)
    }
    sets.push(`sku = $${idx++}`)
    values.push(nextSku)
  }
  if (input.category !== undefined) {
    sets.push(`category_id = $${idx++}`)
    values.push(await resolveCategoryId(input.category))
  }
  if (input.ownerName !== undefined) {
    sets.push(`owner_name = $${idx++}`)
    values.push(input.ownerName.trim() || null)
  }
  if (input.productType !== undefined) {
    sets.push(`product_type = $${idx++}`)
    values.push(input.productType.trim())
  }
  if (input.unitOfMeasure !== undefined) {
    sets.push(`unit_of_measure = $${idx++}`)
    values.push(input.unitOfMeasure.trim())
  }
  if (input.billingPeriod !== undefined) {
    sets.push(`billing_period = $${idx++}`)
    values.push(input.billingPeriod.trim() || null)
  }
  if (input.priceNum !== undefined || input.priceCurrency !== undefined) {
    const priceFields = priceFieldsFromInput({
      priceNum: input.priceNum ?? existing.priceNum,
      priceCurrency: input.priceCurrency ?? existing.priceCurrency,
    })
    sets.push(`price_cents = $${idx++}`)
    values.push(priceFields.priceCents)
    sets.push(`price_currency = $${idx++}`)
    values.push(priceFields.priceCurrency)
    sets.push(`price_amount = $${idx++}`)
    values.push(priceFields.priceAmount)
  }
  if (input.costPriceNum !== undefined) {
    sets.push(`cost_price_cents = $${idx++}`)
    values.push(toCents(input.costPriceNum))
  }
  if (input.stockNum !== undefined) {
    sets.push(`stock_qty = $${idx++}`)
    values.push(input.stockNum)
  }
  if (input.status !== undefined) {
    sets.push(`status = $${idx++}`)
    values.push(input.status)
  }
  if (input.trackInventory !== undefined) {
    sets.push(`track_inventory = $${idx++}`)
    values.push(input.trackInventory)
  }
  if (input.minStock !== undefined) {
    sets.push(`min_stock = $${idx++}`)
    values.push(input.minStock)
  }
  if (input.maxStock !== undefined) {
    sets.push(`max_stock = $${idx++}`)
    values.push(input.maxStock)
  }
  if (input.barcode !== undefined) {
    sets.push(`barcode = $${idx++}`)
    values.push(input.barcode.trim() || null)
  }
  if (input.imageUrl !== undefined) {
    sets.push(`image_url = $${idx++}`)
    values.push(input.imageUrl.trim() || null)
  }

  if (sets.length === 0) return getProductById(id)

  sets.push(`updated_by_id = $${idx++}`)
  values.push(actor.userId)
  sets.push(`updated_by_name = $${idx++}`)
  values.push(actor.userName)
  values.push(id)

  try {
    await pool.query(
      `UPDATE crm_products SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${idx} AND deleted_at IS NULL`,
      values,
    )
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      throw badRequest('Ya existe un producto con ese SKU')
    }
    throw err
  }

  const detail = await getProductById(id)
  if (input.ownerName !== undefined) {
    maybeNotifyRecordOwnerChange({
      actor,
      previousOwner,
      nextOwner: detail.owner ?? '',
      moduleLabel: 'el producto',
      recordTitle: detail.name,
      href: `/productos/${detail.id}`,
      entityType: 'producto',
      entityId: detail.id,
    })
  }
  return detail
}

export async function archiveProduct(
  id: string,
  actor: AuditActor,
): Promise<ProductListItem> {
  const result = await pool.query(
    `UPDATE crm_products
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL
     RETURNING id`,
    [id, actor.userId, actor.userName],
  )
  if (result.rowCount === 0) throw notFound('Producto no encontrado')
  return getProductById(id)
}

export async function restoreProduct(
  id: string,
  actor: AuditActor,
): Promise<ProductListItem> {
  const result = await pool.query(
    `UPDATE crm_products
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id, actor.userId, actor.userName],
  )
  if (result.rowCount === 0) throw notFound('Producto archivado no encontrado')
  return getProductById(id)
}

export async function softDeleteProduct(id: string, actor: AuditActor): Promise<void> {
  const result = await pool.query(
    `UPDATE crm_products
     SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, actor.userId, actor.userName],
  )
  if (result.rowCount === 0) throw notFound('Producto no encontrado')
}

/**
 * Elimina el producto del todo para liberar la restricción única de `sku`.
 * Se permite tanto si estaba en papelera (`archived_at`) como si ya tenía soft-delete (`deleted_at`).
 */
export async function permanentlyDeleteProduct(id: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const productResult = await client.query<{ sku: string }>(
      `SELECT sku
       FROM crm_products
       WHERE id = $1 AND (archived_at IS NOT NULL OR deleted_at IS NOT NULL)
       FOR UPDATE`,
      [id],
    )
    const sku = productResult.rows[0]?.sku?.trim()
    if (!sku) throw notFound('Producto no encontrado en archivados')

    // Limpia referencias de inventario para que el producto desaparezca también de Inventario.
    await client.query(
      `DELETE FROM crm_stock_reservations
       WHERE product_id = $1 OR lower(trim(sku)) = lower($2)`,
      [id, sku],
    )
    await client.query(
      `DELETE FROM crm_stock_movements
       WHERE product_id = $1 OR lower(trim(sku)) = lower($2)`,
      [id, sku],
    )
    await client.query(
      `DELETE FROM crm_inventory_positions
       WHERE product_id = $1 OR lower(trim(sku)) = lower($2)`,
      [id, sku],
    )

    await purgeEntityNotesAndFiles('producto', id, client)

    await client.query(`DELETE FROM crm_products WHERE id = $1`, [id])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
