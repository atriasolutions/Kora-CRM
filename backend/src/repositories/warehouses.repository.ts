import type { PoolClient } from 'pg'

import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import { mapWarehouse, type WarehouseRow } from '../mappers/settings.mapper.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse,
} from '../types/settings.js'

const SELECT_COLUMNS = `id, name, code, address, region, commune, is_default, active`

function codeFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 6) || 'WH'
}

function assertWarehouseLocation(input: {
  address?: string | null
  region?: string | null
  commune?: string | null
}): void {
  const address = input.address?.trim() ?? ''
  const region = input.region?.trim() ?? ''
  const commune = input.commune?.trim() ?? ''
  if (!address) throw badRequest('La dirección de la bodega es obligatoria.')
  if (!region) throw badRequest('La región de la bodega es obligatoria.')
  if (!commune) throw badRequest('La comuna de la bodega es obligatoria.')
  if (region && !commune) {
    throw badRequest('Selecciona una comuna para la región indicada.')
  }
  if (commune && !region) {
    throw badRequest('Selecciona una región para la comuna indicada.')
  }
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const result = await tenantQuery<WarehouseRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_warehouses
     WHERE deleted_at IS NULL AND ${tenantWhereParam(1)}
     ORDER BY is_default DESC, name ASC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapWarehouse)
}

export async function getWarehouseById(id: string): Promise<Warehouse> {
  const result = await tenantQuery<WarehouseRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_warehouses
     WHERE id = $1 AND deleted_at IS NULL AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Bodega no encontrada')
  return mapWarehouse(row)
}

async function clearDefaultWarehouse(client: PoolClient): Promise<void> {
  await client.query(
    `UPDATE crm_warehouses SET is_default = false, updated_at = now()
     WHERE deleted_at IS NULL AND is_default = true`,
  )
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
  const name = input.name.trim()
  if (!name) throw badRequest('El nombre de la bodega es obligatorio')

  const dup = await tenantQuery(
    `SELECT 1 FROM crm_warehouses
     WHERE deleted_at IS NULL AND lower(trim(name)) = lower($1) AND ${tenantWhereParam(2)}`,
    [name, getTenantIdOrDefault()],
  )
  if (dup.rowCount) throw badRequest('Ya existe una bodega con ese nombre')

  const code = (input.code?.trim() || codeFromName(name)).toUpperCase()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM crm_warehouses WHERE deleted_at IS NULL`,
    )
    const isFirst = Number.parseInt(countResult.rows[0]?.count ?? '0', 10) === 0
    const isDefault = input.isDefault === true || isFirst

    if (isDefault) {
      await clearDefaultWarehouse(client)
    }

    const result = await client.query<WarehouseRow>(
      `INSERT INTO crm_warehouses (name, code, address, region, commune, is_default, active, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${SELECT_COLUMNS}`,
      [
        name,
        code,
        input.address?.trim() || null,
        input.region?.trim() || null,
        input.commune?.trim() || null,
        isDefault,
        input.active !== false,
        getTenantIdOrDefault(),
      ],
    )

    const created = mapWarehouse(result.rows[0]!)
    if (input.address !== undefined || input.region !== undefined || input.commune !== undefined) {
      assertWarehouseLocation(created)
    }

    await client.query('COMMIT')
    return created
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function updateWarehouse(
  id: string,
  input: UpdateWarehouseInput,
): Promise<Warehouse> {
  const current = await getWarehouseById(id)

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw badRequest('El nombre de la bodega es obligatorio')
    const dup = await tenantQuery(
      `SELECT 1 FROM crm_warehouses
       WHERE deleted_at IS NULL AND id <> $1 AND lower(trim(name)) = lower($2)`,
      [id, name],
    )
    if (dup.rowCount) throw badRequest('Ya existe una bodega con ese nombre')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    if (input.isDefault === true) {
      await clearDefaultWarehouse(client)
    }

    const sets: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (input.name !== undefined) {
      sets.push(`name = $${idx++}`)
      values.push(input.name.trim())
    }
    if (input.code !== undefined) {
      sets.push(`code = $${idx++}`)
      values.push(input.code.trim().toUpperCase())
    }
    if (input.address !== undefined) {
      sets.push(`address = $${idx++}`)
      values.push(input.address.trim() || null)
    }
    if (input.region !== undefined) {
      sets.push(`region = $${idx++}`)
      values.push(input.region.trim() || null)
    }
    if (input.commune !== undefined) {
      sets.push(`commune = $${idx++}`)
      values.push(input.commune.trim() || null)
    }
    if (input.isDefault !== undefined) {
      sets.push(`is_default = $${idx++}`)
      values.push(input.isDefault)
    }
    if (input.active !== undefined) {
      sets.push(`active = $${idx++}`)
      values.push(input.active)
    }

    if (sets.length === 0) {
      await client.query('COMMIT')
      return current
    }

    sets.push(`updated_at = now()`)
    values.push(id)

    const result = await client.query<WarehouseRow>(
      `UPDATE crm_warehouses
       SET ${sets.join(', ')}
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    const updated = mapWarehouse(result.rows[0]!)
    if (
      input.address !== undefined ||
      input.region !== undefined ||
      input.commune !== undefined
    ) {
      assertWarehouseLocation(updated)
    }

    await client.query('COMMIT')
    return updated
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function deleteWarehouse(id: string): Promise<void> {
  await getWarehouseById(id)

  const countResult = await tenantQuery<{ count: string }>(
    `SELECT count(*)::text AS count FROM crm_warehouses WHERE deleted_at IS NULL`,
  )
  const total = Number.parseInt(countResult.rows[0]?.count ?? '0', 10)
  if (total <= 1) throw badRequest('Debe existir al menos una bodega')

  const target = await getWarehouseById(id)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await setTenantLocal(client)
    await client.query(
      `UPDATE crm_warehouses SET deleted_at = now(), updated_at = now() WHERE id = $1`,
      [id],
    )

    if (target.isDefault) {
      const next = await client.query<{ id: string }>(
        `SELECT id FROM crm_warehouses
         WHERE deleted_at IS NULL
         ORDER BY name ASC
         LIMIT 1`,
      )
      const nextId = next.rows[0]?.id
      if (nextId) {
        await client.query(
          `UPDATE crm_warehouses SET is_default = (id = $1), updated_at = now()
           WHERE deleted_at IS NULL`,
          [nextId],
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
