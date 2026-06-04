import { pool } from '../db/pool.js'
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
  const result = await pool.query<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE deleted_at IS NULL
     ORDER BY name ASC`,
  )
  return result.rows.map(mapProductCategory)
}

export async function getProductCategoryById(id: string): Promise<ProductCategory> {
  const result = await pool.query<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
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

  const dup = await pool.query(
    `SELECT 1 FROM crm_product_categories
     WHERE deleted_at IS NULL AND lower(trim(name)) = lower($1)`,
    [name],
  )
  if (dup.rowCount) throw badRequest('Ya existe una categoría con ese nombre')

  const result = await pool.query<ProductCategoryRow>(
    `INSERT INTO crm_product_categories (name, active)
     VALUES ($1, $2)
     RETURNING ${SELECT_COLUMNS}`,
    [name, input.active !== false],
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
    const dup = await pool.query(
      `SELECT 1 FROM crm_product_categories
       WHERE deleted_at IS NULL AND id <> $1 AND lower(trim(name)) = lower($2)`,
      [id, name],
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
  values.push(id)

  const result = await pool.query<ProductCategoryRow>(
    `UPDATE crm_product_categories
     SET ${sets.join(', ')}
     WHERE id = $${idx} AND deleted_at IS NULL
     RETURNING ${SELECT_COLUMNS}`,
    values,
  )

  return mapProductCategory(result.rows[0]!)
}

export async function deleteProductCategory(id: string): Promise<void> {
  await getProductCategoryById(id)

  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_product_categories WHERE deleted_at IS NULL`,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  if (total <= 1) throw badRequest('Debe existir al menos una categoría')

  await pool.query(
    `UPDATE crm_product_categories SET deleted_at = now(), updated_at = now() WHERE id = $1`,
    [id],
  )
}
