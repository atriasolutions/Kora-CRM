import type { PoolClient } from 'pg'

import { pool } from '../db/pool.js'

type Queryable = Pick<PoolClient, 'query'>

/** Elimina notas y archivos adjuntos de un registro (libera espacio en BD). */
export async function purgeEntityNotesAndFiles(
  entityType: string,
  entityId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `DELETE FROM crm_entity_notes WHERE entity_type = $1 AND entity_id = $2::uuid`,
    [entityType, entityId],
  )
  await db.query(
    `DELETE FROM crm_entity_files WHERE entity_type = $1 AND entity_id = $2::uuid`,
    [entityType, entityId],
  )
}
