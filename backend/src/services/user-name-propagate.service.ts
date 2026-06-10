import { pool } from '../db/pool.js'

type NameColumnUpdate = {
  table: string
  column: string
  userIdColumn?: string
  matchOldName?: boolean
}

const UPDATES: NameColumnUpdate[] = [
  { table: 'crm_contacts', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_contacts', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_contacts', column: 'owner_name', matchOldName: true },
  { table: 'crm_companies', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_companies', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_companies', column: 'owner', matchOldName: true },
  { table: 'crm_opportunities', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_opportunities', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_opportunities', column: 'owner_name', matchOldName: true },
  { table: 'crm_quotes', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_quotes', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_quotes', column: 'owner_name', matchOldName: true },
  { table: 'crm_invoices', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_invoices', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_invoices', column: 'owner_name', matchOldName: true },
  { table: 'crm_purchases', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_purchases', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_purchases', column: 'owner_name', matchOldName: true },
  { table: 'crm_stock_receipts', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_stock_receipts', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_stock_receipts', column: 'owner_name', matchOldName: true },
  { table: 'crm_activities', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_activities', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_activities', column: 'assignee_name', userIdColumn: 'assignee_user_id' },
  { table: 'crm_activities', column: 'assignee_name', matchOldName: true },
  { table: 'crm_projects', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_projects', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_projects', column: 'manager_name', userIdColumn: 'manager_user_id' },
  { table: 'crm_projects', column: 'manager_name', matchOldName: true },
  { table: 'crm_bitacora_entries', column: 'assigned_user_name', userIdColumn: 'assigned_user_id' },
  { table: 'crm_bitacora_entries', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_bitacora_entries', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_products', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_products', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_products', column: 'owner_name', matchOldName: true },
  { table: 'crm_users', column: 'created_by_name', userIdColumn: 'created_by_id' },
  { table: 'crm_users', column: 'updated_by_name', userIdColumn: 'updated_by_id' },
  { table: 'crm_entity_notes', column: 'author_name', userIdColumn: 'author_user_id' },
]

/** Actualiza referencias desnormalizadas cuando cambia el nombre de un usuario. */
export async function propagateUserDisplayName(
  userId: string,
  newName: string,
  oldName: string,
): Promise<void> {
  await reconcileUserDenormalizedNames(userId, newName)

  const trimmedOld = oldName.trim()
  if (!trimmedOld || trimmedOld === newName.trim()) return

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const spec of UPDATES) {
      if (spec.matchOldName) {
        await client.query(
          `UPDATE ${spec.table}
           SET ${spec.column} = $1
           WHERE lower(trim(${spec.column})) = lower(trim($2))`,
          [newName.trim(), trimmedOld],
        )
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Sincroniza nombres desnormalizados usando el ID de usuario (auditoría y asignaciones con FK). */
export async function reconcileUserDenormalizedNames(
  userId: string,
  nameOverride?: string,
): Promise<void> {
  let newName = nameOverride?.trim()
  if (!newName) {
    const result = await pool.query<{ name: string }>(
      `SELECT name FROM crm_users WHERE id = $1::uuid AND deleted_at IS NULL`,
      [userId],
    )
    newName = result.rows[0]?.name?.trim()
  }
  if (!newName) return

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const spec of UPDATES) {
      if (spec.userIdColumn) {
        await client.query(
          `UPDATE ${spec.table}
           SET ${spec.column} = $1
           WHERE ${spec.userIdColumn} = $2::uuid`,
          [newName, userId],
        )
      }
    }

    await client.query(
      `UPDATE crm_contacts SET owner_name = $1 WHERE created_by_id = $2::uuid`,
      [newName, userId],
    )
    await client.query(
      `UPDATE crm_opportunities SET owner_name = $1 WHERE created_by_id = $2::uuid`,
      [newName, userId],
    )
    await client.query(
      `UPDATE crm_quotes SET owner_name = $1 WHERE created_by_id = $2::uuid`,
      [newName, userId],
    )
    await client.query(
      `UPDATE crm_invoices SET owner_name = $1 WHERE created_by_id = $2::uuid`,
      [newName, userId],
    )
    await client.query(
      `UPDATE crm_purchases SET owner_name = $1 WHERE created_by_id = $2::uuid`,
      [newName, userId],
    )
    await client.query(
      `UPDATE crm_products SET owner_name = $1 WHERE created_by_id = $2::uuid`,
      [newName, userId],
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
