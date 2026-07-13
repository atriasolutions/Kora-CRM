import type { PoolClient } from 'pg'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'

import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { pushTenantCondition, tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
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
import {
  getProductCategoryScopeIds,
  resolveProductCategoryIdForProduct,
} from './product-categories.repository.js'

const SELECT_COLUMNS = `
  p.id, p.name, p.sku,
  p.category_id,
  CASE WHEN c.parent_id IS NULL THEN c.id ELSE c.parent_id END AS root_category_id,
  CASE WHEN c.parent_id IS NULL THEN c.name ELSE parent.name END AS category_name,
  CASE WHEN c.parent_id IS NOT NULL THEN c.id ELSE NULL END AS subcategory_id,
  CASE WHEN c.parent_id IS NOT NULL THEN c.name ELSE NULL END AS subcategory_name,
  p.product_type, p.unit_of_measure,
  p.billing_period,
  p.price_cents, p.price_currency, p.price_amount, p.cost_price_cents,
  CASE
    WHEN p.track_inventory THEN COALESCE(FLOOR(inv.total_on_hand), 0)::int
    ELSE p.stock_qty
  END AS stock_qty,
  p.status, p.track_inventory, p.min_stock, p.max_stock,
  p.barcode, p.image_url, p.description, p.brand,
  p.publish_in_integration, p.publish_price_in_integration,
  p.created_at, p.created_by_id, p.created_by_name, p.owner_name,
  p.updated_at, p.updated_by_id, p.updated_by_name
`

const FROM_JOIN = `
  FROM crm_products p
  LEFT JOIN crm_product_categories c
    ON c.id = p.category_id AND c.tenant_id = p.tenant_id AND c.deleted_at IS NULL
  LEFT JOIN crm_product_categories parent
    ON parent.id = c.parent_id AND parent.tenant_id = p.tenant_id AND parent.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(ip.quantity_on_hand), 0) AS total_on_hand
    FROM crm_inventory_positions ip
    WHERE ip.tenant_id = p.tenant_id
      AND (ip.product_id = p.id
        OR lower(trim(ip.sku)) = lower(trim(p.sku)))
  ) inv ON true
`

const FROM_COUNT = `
  FROM crm_products p
  LEFT JOIN crm_product_categories c
    ON c.id = p.category_id AND c.tenant_id = p.tenant_id AND c.deleted_at IS NULL
  LEFT JOIN crm_product_categories parent
    ON parent.id = c.parent_id AND parent.tenant_id = p.tenant_id AND parent.deleted_at IS NULL
`

export type ListProductsParams = {
  page: number
  pageSize: number
  q?: string
  status?: string
  categoryId?: string
  archivedOnly?: boolean
  /** Solo productos visibles en API de integración externa */
  integrationPublishedOnly?: boolean
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
     WHERE deleted_at IS NULL AND active = true AND tenant_id = $1
     ORDER BY is_default DESC, name ASC
     LIMIT 1`,
    [getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  return { id: row?.id ?? null, name: row?.name ?? 'Bodega central' }
}

async function findInventoryPositionIds(
  client: PoolClient,
  params: { productId: string; sku: string },
): Promise<string[]> {
  const sku = params.sku.trim()
  const result = await client.query<{ id: string }>(
    `SELECT id
     FROM crm_inventory_positions
     WHERE tenant_id = $1
       AND (product_id = $2 OR lower(trim(sku)) = lower($3))`,
    [getTenantIdOrDefault(), params.productId, sku],
  )
  return result.rows.map((row) => row.id)
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
  const tenantId = getTenantIdOrDefault()

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM crm_inventory_positions
     WHERE lower(trim(sku)) = lower($1)
       AND warehouse_id IS NOT DISTINCT FROM $2
       AND tenant_id = $3
     LIMIT 1`,
    [sku, warehouse.id, tenantId],
  )
  const existingId = existing.rows[0]?.id
  if (existingId) {
    await client.query(
      `UPDATE crm_inventory_positions
       SET product_id = $1,
           product_name = $2,
           sku = $3,
           min_stock = $4,
           status = $5,
           updated_at = now()
       WHERE id = $6 AND tenant_id = $7`,
      [
        params.productId,
        params.productName.trim(),
        sku,
        minStock,
        status,
        existingId,
        tenantId,
      ],
    )
    return
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO crm_inventory_positions (
      product_id, product_name, sku, warehouse_id, warehouse_name,
      quantity_on_hand, quantity_reserved, quantity_available, min_stock, status,
      last_movement_at, tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, now(), $10)
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
      getTenantIdOrDefault(),
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

/** Borra posiciones, movimientos y reservas al desactivar control de stock. */
async function removeInventoryForProduct(
  client: PoolClient,
  params: { productId: string; sku: string },
): Promise<void> {
  const sku = params.sku.trim()
  const productId = params.productId
  const tenantId = getTenantIdOrDefault()
  const positionIds = await findInventoryPositionIds(client, { productId, sku })

  if (positionIds.length > 0) {
    await client.query(
      `DELETE FROM crm_stock_reservations
       WHERE inventory_position_id = ANY($1::uuid[])
          OR product_id = $2
          OR lower(trim(sku)) = lower($3)`,
      [positionIds, productId, sku],
    )
    await client.query(
      `DELETE FROM crm_stock_movements
       WHERE inventory_position_id = ANY($1::uuid[])
          OR product_id = $2
          OR lower(trim(sku)) = lower($3)`,
      [positionIds, productId, sku],
    )
    await client.query(
      `DELETE FROM crm_inventory_positions
       WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
      [tenantId, positionIds],
    )
    return
  }

  await client.query(
    `DELETE FROM crm_stock_reservations
     WHERE product_id = $1 OR lower(trim(sku)) = lower($2)`,
    [productId, sku],
  )
  await client.query(
    `DELETE FROM crm_stock_movements
     WHERE product_id = $1 OR lower(trim(sku)) = lower($2)`,
    [productId, sku],
  )
  await client.query(
    `DELETE FROM crm_inventory_positions
     WHERE tenant_id = $1
       AND (product_id = $2 OR lower(trim(sku)) = lower($3))`,
    [tenantId, productId, sku],
  )
}

async function syncInventoryAfterProductUpdate(
  client: PoolClient,
  params: {
    productId: string
    productName: string
    sku: string
    trackInventory: boolean
    previousTrackInventory: boolean
    onHand: number
    minStock: number
    actor: AuditActor
  },
): Promise<void> {
  if (!params.trackInventory) {
    await removeInventoryForProduct(client, {
      productId: params.productId,
      sku: params.sku,
    })
    return
  }

  if (!params.previousTrackInventory) {
    await ensureInventoryPositionForNewProduct(client, {
      productId: params.productId,
      productName: params.productName,
      sku: params.sku,
      onHand: params.onHand,
      minStock: params.minStock,
      actor: params.actor,
    })
    return
  }

  const positions = await client.query<{
    id: string
    quantity_on_hand: string | number
    quantity_reserved: string | number
    min_stock: string | number | null
    status: string | null
  }>(
    `SELECT id, quantity_on_hand, quantity_reserved, min_stock, status
     FROM crm_inventory_positions
     WHERE tenant_id = $1
       AND (product_id = $2 OR lower(trim(sku)) = lower($3))`,
    [getTenantIdOrDefault(), params.productId, params.sku.trim()],
  )

  if (positions.rows.length === 0) {
    await ensureInventoryPositionForNewProduct(client, {
      productId: params.productId,
      productName: params.productName,
      sku: params.sku,
      onHand: params.onHand,
      minStock: params.minStock,
      actor: params.actor,
    })
    return
  }

  for (const pos of positions.rows) {
    const onHand = Number(pos.quantity_on_hand ?? 0)
    const reserved = Number(pos.quantity_reserved ?? 0)
    const minStock = Math.max(0, params.minStock)
    const status = deriveInventoryStatus(
      onHand,
      reserved,
      minStock,
      pos.status as import('../types/inventory.js').InventoryStatus | null,
    )
    await client.query(
      `UPDATE crm_inventory_positions
       SET product_name = $1,
           sku = $2,
           min_stock = $3,
           status = $4,
           updated_at = now()
       WHERE id = $5 AND tenant_id = $6`,
      [
        params.productName.trim(),
        params.sku.trim(),
        minStock,
        status,
        pos.id,
        getTenantIdOrDefault(),
      ],
    )
  }
}

export async function listProducts(
  params: ListProductsParams,
): Promise<{ items: ProductListItem[]; total: number }> {
  const result = await listProductRows(params)
  return { items: result.items.map(mapProductRow), total: result.total }
}

export async function listProductRows(
  params: ListProductsParams,
): Promise<{ items: ProductRow[]; total: number }> {
  const conditions: string[] = ['p.deleted_at IS NULL']
  const values: unknown[] = []
  let idx = 1

  idx = pushTenantCondition(conditions, values, idx, 'p')
  if (params.archivedOnly) {
    conditions.push('p.archived_at IS NOT NULL')
  } else {
    conditions.push('p.archived_at IS NULL')
  }
  if (params.status) {
    conditions.push(`p.status = $${idx++}`)
    values.push(params.status)
  }
  if (params.categoryId) {
    const scopeIds = await getProductCategoryScopeIds(params.categoryId)
    conditions.push(`p.category_id = ANY($${idx++}::uuid[])`)
    values.push(scopeIds)
  }
  if (params.q) {
    conditions.push(
      `(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR c.name ILIKE $${idx} OR parent.name ILIKE $${idx})`,
    )
    values.push(`%${params.q}%`)
    idx++
  }
  if (params.integrationPublishedOnly) {
    conditions.push('p.publish_in_integration = true')
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  return withTenantClient(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count ${FROM_COUNT} ${where}`,
      values,
    )
    const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)

    const offset = paginationOffset(params.page, params.pageSize)
    const listValues = [...values, params.pageSize, offset]

    const result = await client.query<ProductRow>(
      `SELECT ${SELECT_COLUMNS}
       ${FROM_JOIN}
       ${where}
       ORDER BY p.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      listValues,
    )

    return { items: result.rows, total }
  })
}

export async function getProductStoredImageUrl(id: string): Promise<string | null> {
  const result = await tenantQuery<{ image_url: string | null }>(
    `SELECT p.image_url
     FROM crm_products p
     WHERE p.id = $1 AND p.deleted_at IS NULL AND ${tenantWhereParam(2, 'p')}`,
    [id, getTenantIdOrDefault()],
  )
  return result.rows[0]?.image_url?.trim() || null
}

export async function getProductById(id: string): Promise<ProductListItem> {
  const result = await tenantQuery<ProductRow>(
    `SELECT ${SELECT_COLUMNS}
     ${FROM_JOIN}
     WHERE p.id = $1 AND p.deleted_at IS NULL AND ${tenantWhereParam(2, 'p')}`,
    [id, getTenantIdOrDefault()],
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

  const tenantId = getTenantIdOrDefault()
  const sql = excludeProductId
    ? `SELECT id, name
     FROM crm_products
     WHERE lower(trim(sku)) = lower($1)
       AND deleted_at IS NULL
       AND tenant_id = $3
       AND id <> $2
     LIMIT 1`
    : `SELECT id, name
     FROM crm_products
     WHERE lower(trim(sku)) = lower($1)
       AND deleted_at IS NULL
       AND tenant_id = $2
     LIMIT 1`
  const params = excludeProductId
    ? [trimmed, excludeProductId, tenantId]
    : [trimmed, tenantId]
  const result = client
    ? await client.query<{ id: string; name: string }>(sql, params)
    : await tenantQuery<{ id: string; name: string }>(sql, params)
  const row = result.rows[0]
  if (row) {
    throw badRequest(
      `Ya existe un producto con el SKU «${trimmed}» (${row.name})`,
    )
  }
}

function normalizeIntegrationPublishFlags(input: {
  publishInIntegration?: boolean
  publishPriceInIntegration?: boolean
}): { publishInIntegration: boolean; publishPriceInIntegration: boolean } {
  const publishInIntegration = input.publishInIntegration ?? true
  const publishPriceInIntegration = publishInIntegration
    ? (input.publishPriceInIntegration ?? true)
    : false
  return { publishInIntegration, publishPriceInIntegration }
}

export async function createProduct(
  input: CreateProductInput,
  actor: AuditActor,
): Promise<ProductListItem> {
  await enforceRecordQuota(actor)
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')
  if (!input.sku?.trim()) throw badRequest('El SKU es obligatorio')

  const categoryId = await resolveProductCategoryIdForProduct(
    input.category,
    input.subcategory,
  )
  const trackInventory = input.trackInventory ?? true
  const stockQty =
    trackInventory && input.stockNum != null ? input.stockNum : null
  const onHand = trackInventory ? Math.max(0, stockQty ?? 0) : 0
  const minStock = trackInventory ? Math.max(0, input.minStock ?? 0) : 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

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
    const publishFlags = normalizeIntegrationPublishFlags(input)

    const result = await client.query<{ id: string }>(
      `INSERT INTO crm_products (
        name, sku, category_id, product_type, unit_of_measure, billing_period,
        price_cents, price_currency, price_amount, cost_price_cents, stock_qty, status, track_inventory,
        min_stock, max_stock, barcode, image_url, description,
        created_by_id, created_by_name, owner_name, updated_by_id, updated_by_name, tenant_id, brand,
        publish_in_integration, publish_price_in_integration
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $19, $20, $22, $23,
        $24, $25
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
        input.description?.trim() || null,
        actor.userId,
        actor.userName,
        input.ownerName?.trim() || actor.userName,
        getTenantIdOrDefault(),
        input.brand?.trim() || null,
        publishFlags.publishInIntegration,
        publishFlags.publishPriceInIntegration,
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
  const previousTrackInventory = existing.trackInventory

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
  if (input.category !== undefined || input.subcategory !== undefined) {
    const nextCategory =
      input.category !== undefined ? input.category : existing.category
    const nextSubcategory =
      input.subcategory !== undefined ? input.subcategory : existing.subcategory
    sets.push(`category_id = $${idx++}`)
    values.push(
      await resolveProductCategoryIdForProduct(nextCategory, nextSubcategory),
    )
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
    if (!input.trackInventory) {
      sets.push(`min_stock = $${idx++}`)
      values.push(null)
      sets.push(`max_stock = $${idx++}`)
      values.push(null)
    }
  }
  if (input.minStock !== undefined && (input.trackInventory ?? previousTrackInventory)) {
    sets.push(`min_stock = $${idx++}`)
    values.push(input.minStock)
  }
  if (input.maxStock !== undefined && (input.trackInventory ?? previousTrackInventory)) {
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
  if (input.description !== undefined) {
    sets.push(`description = $${idx++}`)
    values.push(input.description.trim() || null)
  }
  if (input.brand !== undefined) {
    sets.push(`brand = $${idx++}`)
    values.push(input.brand.trim() || null)
  }
  if (input.publishInIntegration !== undefined || input.publishPriceInIntegration !== undefined) {
    const publishFlags = normalizeIntegrationPublishFlags({
      publishInIntegration:
        input.publishInIntegration ?? existing.publishInIntegration,
      publishPriceInIntegration:
        input.publishPriceInIntegration ?? existing.publishPriceInIntegration,
    })
    sets.push(`publish_in_integration = $${idx++}`)
    values.push(publishFlags.publishInIntegration)
    sets.push(`publish_price_in_integration = $${idx++}`)
    values.push(publishFlags.publishPriceInIntegration)
  }

  const nextTrackInventory = input.trackInventory ?? previousTrackInventory
  const nextName = input.name?.trim() ?? existing.name
  const nextSku = input.sku?.trim() ?? existing.sku
  const nextOnHand =
    input.stockNum !== undefined
      ? Math.max(0, input.stockNum)
      : existing.stockNum >= 0
        ? existing.stockNum
        : 0
  const nextMinStock =
    nextTrackInventory
      ? input.minStock !== undefined
        ? Math.max(0, input.minStock)
        : existing.minStockNum
      : 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    if (sets.length > 0) {
      sets.push(`updated_by_id = $${idx++}`)
      values.push(actor.userId)
      sets.push(`updated_by_name = $${idx++}`)
      values.push(actor.userName)
      values.push(id)

      try {
        await client.query(
          `UPDATE crm_products SET ${sets.join(', ')}, updated_at = now()
           WHERE id = $${idx} AND deleted_at IS NULL AND tenant_id = $${idx + 1}`,
          [...values, getTenantIdOrDefault()],
        )
      } catch (err) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          throw badRequest('Ya existe un producto con ese SKU')
        }
        throw err
      }
    }

    await syncInventoryAfterProductUpdate(client, {
      productId: id,
      productName: nextName,
      sku: nextSku,
      trackInventory: nextTrackInventory,
      previousTrackInventory,
      onHand: nextOnHand,
      minStock: nextMinStock,
      actor,
    })

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      throw badRequest('Ya existe un producto o posición de inventario con ese SKU')
    }
    throw err
  } finally {
    client.release()
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
  const result = await tenantQuery(
    `UPDATE crm_products
     SET archived_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND archived_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING id`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Producto no encontrado')
  return getProductById(id)
}

export async function restoreProduct(
  id: string,
  actor: AuditActor,
): Promise<ProductListItem> {
  const result = await tenantQuery(
    `UPDATE crm_products
     SET archived_at = NULL, updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}
     RETURNING id`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Producto archivado no encontrado')
  return getProductById(id)
}

export async function softDeleteProduct(id: string, actor: AuditActor): Promise<void> {
  const result = await tenantQuery(
    `UPDATE crm_products
     SET deleted_at = now(), updated_by_id = $2, updated_by_name = $3, updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(4)}`,
    [id, actor.userId, actor.userName, getTenantIdOrDefault()],
  )
  if (result.rowCount === 0) throw notFound('Producto no encontrado')
}

/**
 * Elimina el producto del todo para liberar la restricción única de `sku`.
 * Se permite tanto si estaba en papelera (`archived_at`) como si ya tenía soft-delete (`deleted_at`).
 */
export type ProductInvoiceSalesTotalRow = {
  productId: string | null
  sku: string
  productName: string
  totalQuantity: number
}

/** Unidades facturadas por producto en facturas emitidas (no borrador ni anulada). */
export async function listProductInvoiceSalesTotals(): Promise<ProductInvoiceSalesTotalRow[]> {
  const result = await tenantQuery<{
    product_id: string | null
    sku: string | null
    product_name: string | null
    total_quantity: string
  }>(
    `WITH issued_lines AS (
       SELECT
         li.product_id,
         trim(lower(li.sku)) AS sku_key,
         trim(li.sku) AS sku,
         trim(li.product_name) AS product_name,
         li.quantity
       FROM crm_invoice_line_items li
       INNER JOIN crm_invoices inv ON inv.id = li.invoice_id
       WHERE inv.deleted_at IS NULL
         AND inv.archived_at IS NULL
         AND inv.status NOT IN ('Borrador', 'Anulada')
         AND ${tenantWhereParam(1, 'inv')}
     ),
     by_product AS (
       SELECT
         product_id,
         NULL::text AS sku,
         max(product_name) AS product_name,
         COALESCE(SUM(quantity), 0) AS total_quantity
       FROM issued_lines
       WHERE product_id IS NOT NULL
       GROUP BY product_id
     ),
     by_sku AS (
       SELECT
         NULL::uuid AS product_id,
         max(sku) AS sku,
         max(product_name) AS product_name,
         COALESCE(SUM(quantity), 0) AS total_quantity
       FROM issued_lines
       WHERE product_id IS NULL AND sku_key <> ''
       GROUP BY sku_key
     )
     SELECT product_id, sku, product_name, total_quantity::text
     FROM (
       SELECT * FROM by_product
       UNION ALL
       SELECT * FROM by_sku
     ) combined
     WHERE total_quantity > 0
     ORDER BY total_quantity DESC`,
    [getTenantIdOrDefault()],
  )

  return result.rows.map((row) => ({
    productId: row.product_id,
    sku: row.sku?.trim() ?? '',
    productName: row.product_name?.trim() ?? '',
    totalQuantity: Number.parseFloat(row.total_quantity) || 0,
  }))
}

export async function permanentlyDeleteProduct(id: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

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
