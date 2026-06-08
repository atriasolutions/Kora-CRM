import { tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapProductCategory,
  type ProductCategoryRow,
} from '../mappers/settings.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type {
  CreateProductCategoryInput,
  ProductCategory,
  UpdateProductCategoryInput,
} from '../types/settings.js'

const SELECT_COLUMNS = `id, name, active`

export async function listProductCategories(): Promise<ProductCategory[]> {
  const result = await tenantQuery<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE deleted_at IS NULL AND ${tenantWhereParam(1)}
     ORDER BY name ASC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapProductCategory)
}

export async function getProductCategoryById(id: string): Promise<ProductCategory> {
  const result = await tenantQuery<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Categoría no encontrada')
  return mapProductCategory(row)
}

export async function createProductCategory(
  input: CreateProductCategoryInput,
): Promise<ProductCategory> {
  const name = input.name.trim()
  if (!name) throw badRequest('El nombre de la categoría es obligatorio')

  const dup = await tenantQuery(
    `SELECT 1 FROM crm_product_categories
     WHERE deleted_at IS NULL AND lower(trim(name)) = lower($1) AND ${tenantWhereParam(2)}`,
    [name, getTenantIdOrDefault()],
  )
  if (dup.rowCount) throw badRequest('Ya existe una categoría con ese nombre')

  const result = await tenantQuery<ProductCategoryRow>(
    `INSERT INTO crm_product_categories (name, active, tenant_id)
     VALUES ($1, $2, $3)
     RETURNING ${SELECT_COLUMNS}`,
    [name, input.active !== false, getTenantIdOrDefault()],
  )
  return mapProductCategory(result.rows[0]!)
}

export async function updateProductCategory(
  id: string,
  input: UpdateProductCategoryInput,
): Promise<ProductCategory> {
  await getProductCategoryById(id)

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw badRequest('El nombre de la categoría es obligatorio')
    const dup = await tenantQuery(
      `SELECT 1 FROM crm_product_categories
       WHERE deleted_at IS NULL AND id <> $1 AND lower(trim(name)) = lower($2) AND ${tenantWhereParam(3)}`,
      [id, name, getTenantIdOrDefault()],
    )
    if (dup.rowCount) throw badRequest('Ya existe una categoría con ese nombre')
  }

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (input.name !== undefined) {
    sets.push(`name = $${idx++}`)
    values.push(input.name.trim())
  }
  if (input.active !== undefined) {
    sets.push(`active = $${idx++}`)
    values.push(input.active)
  }

  if (sets.length === 0) return getProductCategoryById(id)

  sets.push(`updated_at = now()`)
  values.push(id, getTenantIdOrDefault())

  const result = await tenantQuery<ProductCategoryRow>(
    `UPDATE crm_product_categories
     SET ${sets.join(', ')}
     WHERE id = $${idx} AND deleted_at IS NULL AND ${tenantWhereParam(idx + 1)}
     RETURNING ${SELECT_COLUMNS}`,
    values,
  )

  return mapProductCategory(result.rows[0]!)
}

export async function deleteProductCategory(id: string): Promise<void> {
  await getProductCategoryById(id)

  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_product_categories WHERE deleted_at IS NULL AND ${tenantWhereParam(1)}`,
    [getTenantIdOrDefault()],
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  if (total <= 1) throw badRequest('Debe existir al menos una categoría')

  await tenantQuery(
    `UPDATE crm_product_categories SET deleted_at = now(), updated_at = now() WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
}
