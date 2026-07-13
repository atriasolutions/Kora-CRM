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

const SELECT_COLUMNS = `id, name, active, parent_id`

export const DEFAULT_PRODUCT_CATEGORY_NAME = 'General'

/** Crea la categoría por defecto si la instancia aún no tiene ninguna. */
export async function seedDefaultProductCategories(
  tenantId?: string,
): Promise<void> {
  const scopedTenantId = tenantId ?? getTenantIdOrDefault()
  const existing = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_product_categories
     WHERE deleted_at IS NULL AND ${tenantWhereParam(1)}`,
    [scopedTenantId],
  )
  if (Number.parseInt(existing.rows[0]?.count ?? '0', 10) > 0) return

  await tenantQuery(
    `INSERT INTO crm_product_categories (name, active, tenant_id, parent_id)
     VALUES ($1, true, $2, NULL)`,
    [DEFAULT_PRODUCT_CATEGORY_NAME, scopedTenantId],
  )
}

function normalizeCategoryName(name?: string): string {
  return name?.trim() || DEFAULT_PRODUCT_CATEGORY_NAME
}

async function findRootCategoryByName(
  name: string,
): Promise<ProductCategoryRow | null> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE deleted_at IS NULL
       AND active = true
       AND parent_id IS NULL
       AND lower(trim(name)) = lower($1)
       AND ${tenantWhereParam(2)}
     LIMIT 1`,
    [name, tenantId],
  )
  return result.rows[0] ?? null
}

async function findSubcategoryByName(
  parentId: string,
  name: string,
): Promise<ProductCategoryRow | null> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE deleted_at IS NULL
       AND active = true
       AND parent_id = $1
       AND lower(trim(name)) = lower($2)
       AND ${tenantWhereParam(3)}
     LIMIT 1`,
    [parentId, name, tenantId],
  )
  return result.rows[0] ?? null
}

/**
 * Resuelve categoría raíz por nombre **solo dentro del tenant actual**.
 * Si no existe, la crea como categoría raíz.
 */
export async function resolveProductCategoryIdByName(
  categoryName?: string,
): Promise<string | null> {
  const name = normalizeCategoryName(categoryName)
  const tenantId = getTenantIdOrDefault()

  const existing = await findRootCategoryByName(name)
  if (existing) return existing.id

  const inserted = await tenantQuery<{ id: string }>(
    `INSERT INTO crm_product_categories (name, active, tenant_id, parent_id)
     VALUES ($1, true, $2, NULL)
     RETURNING id`,
    [name, tenantId],
  )
  return inserted.rows[0]?.id ?? null
}

/** Resuelve la categoría hoja (raíz o subcategoría) para asignar a un producto. */
export async function resolveProductCategoryIdForProduct(
  categoryName?: string,
  subcategoryName?: string,
): Promise<string | null> {
  const rootName = normalizeCategoryName(categoryName)
  const subName = subcategoryName?.trim()

  if (subName) {
    const root = await findRootCategoryByName(rootName)
    if (!root) {
      throw badRequest(`La categoría «${rootName}» no existe.`)
    }
    const sub = await findSubcategoryByName(root.id, subName)
    if (!sub) {
      throw badRequest(
        `La subcategoría «${subName}» no existe en la categoría «${rootName}».`,
      )
    }
    return sub.id
  }

  return resolveProductCategoryIdByName(rootName)
}

/** IDs de categoría para filtrar productos (raíz + subcategorías hijas). */
export async function getProductCategoryScopeIds(
  categoryId: string,
): Promise<string[]> {
  const category = await getProductCategoryById(categoryId)
  if (category.parentId) return [categoryId]

  const children = await tenantQuery<{ id: string }>(
    `SELECT id
     FROM crm_product_categories
     WHERE deleted_at IS NULL
       AND parent_id = $1
       AND ${tenantWhereParam(2)}`,
    [categoryId, getTenantIdOrDefault()],
  )
  return [categoryId, ...children.rows.map((row) => row.id)]
}

export async function assertProductCategoryBelongsToTenant(
  categoryId: string | null | undefined,
): Promise<void> {
  if (!categoryId) return
  const result = await tenantQuery(
    `SELECT 1
     FROM crm_product_categories
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [categoryId, getTenantIdOrDefault()],
  )
  if (!result.rowCount) {
    throw badRequest('La categoría no pertenece a esta instancia.')
  }
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  const result = await tenantQuery<ProductCategoryRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_product_categories
     WHERE deleted_at IS NULL AND ${tenantWhereParam(1)}
     ORDER BY parent_id NULLS FIRST, name ASC`,
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

async function assertDuplicateName(
  name: string,
  parentId: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  const tenantId = getTenantIdOrDefault()
  const dup = await tenantQuery(
    `SELECT 1 FROM crm_product_categories
     WHERE deleted_at IS NULL
       AND lower(trim(name)) = lower($1)
       AND parent_id IS NOT DISTINCT FROM $2::uuid
       AND ${tenantWhereParam(3)}
       ${excludeId ? 'AND id <> $4' : ''}`,
    excludeId
      ? [name, parentId ?? null, tenantId, excludeId]
      : [name, parentId ?? null, tenantId],
  )
  if (dup.rowCount) {
    throw badRequest(
      parentId
        ? 'Ya existe una subcategoría con ese nombre en esta categoría.'
        : 'Ya existe una categoría con ese nombre.',
    )
  }
}

export async function createProductCategory(
  input: CreateProductCategoryInput,
): Promise<ProductCategory> {
  const name = input.name.trim()
  if (!name) throw badRequest('El nombre de la categoría es obligatorio')

  const parentId = input.parentId ?? null
  if (parentId) {
    const parent = await getProductCategoryById(parentId)
    if (parent.parentId) {
      throw badRequest('Solo se permiten subcategorías de primer nivel.')
    }
  }

  await assertDuplicateName(name, parentId)

  const result = await tenantQuery<ProductCategoryRow>(
    `INSERT INTO crm_product_categories (name, active, tenant_id, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${SELECT_COLUMNS}`,
    [name, input.active !== false, getTenantIdOrDefault(), parentId],
  )
  return mapProductCategory(result.rows[0]!)
}

export async function updateProductCategory(
  id: string,
  input: UpdateProductCategoryInput,
): Promise<ProductCategory> {
  const current = await getProductCategoryById(id)

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw badRequest('El nombre de la categoría es obligatorio')
    await assertDuplicateName(name, current.parentId ?? null, id)
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

  if (sets.length === 0) return current

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
  const current = await getProductCategoryById(id)

  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM crm_product_categories
     WHERE deleted_at IS NULL
       AND parent_id IS NULL
       AND ${tenantWhereParam(1)}`,
    [getTenantIdOrDefault()],
  )
  const rootTotal = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  if (!current.parentId && rootTotal <= 1) {
    throw badRequest('Debe existir al menos una categoría raíz.')
  }

  if (!current.parentId) {
    const children = await tenantQuery<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM crm_product_categories
       WHERE deleted_at IS NULL AND parent_id = $1 AND ${tenantWhereParam(2)}`,
      [id, getTenantIdOrDefault()],
    )
    if (Number.parseInt(children.rows[0]?.count ?? '0', 10) > 0) {
      throw badRequest('Elimina primero las subcategorías de esta categoría.')
    }
  }

  await tenantQuery(
    `UPDATE crm_product_categories
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
}
