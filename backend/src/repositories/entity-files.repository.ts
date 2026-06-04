import { pool } from '../db/pool.js'
import {
  mapEntityFileRow,
  type EntityFileRow,
} from '../mappers/entity-file.mapper.js'
import type { EntityFileDto } from '../types/entity-file.js'

export async function ensureEntityFilesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_entity_files (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type           VARCHAR(64) NOT NULL,
      entity_id             UUID NOT NULL,
      entity_label_snapshot VARCHAR(255) NOT NULL DEFAULT '',
      file_name             VARCHAR(512) NOT NULL,
      size_bytes            BIGINT,
      mime_type             VARCHAR(128),
      storage_key           TEXT NOT NULL,
      uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      uploaded_by_id        UUID REFERENCES crm_users(id) ON DELETE SET NULL,
      uploaded_by_name      VARCHAR(255)
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_entity_files_entity
      ON crm_entity_files (entity_type, entity_id)
  `)
}

export async function listEntityFiles(
  entityType: string,
  entityId: string,
): Promise<EntityFileDto[]> {
  const result = await pool.query<EntityFileRow>(
    `SELECT id, entity_type, entity_id, entity_label_snapshot, file_name,
            size_bytes, mime_type, storage_key, uploaded_at,
            uploaded_by_id, uploaded_by_name
     FROM crm_entity_files
     WHERE entity_type = $1 AND entity_id = $2::uuid
     ORDER BY uploaded_at DESC`,
    [entityType, entityId],
  )
  return result.rows.map(mapEntityFileRow)
}

export async function replaceEntityFiles(params: {
  entityType: string
  entityId: string
  entityLabel: string
  uploadedById?: string | null
  uploadedByName?: string | null
  files: Array<{
    name: string
    size: number
    mimeType?: string
    storageKey: string
    uploadedByName?: string | null
  }>
}): Promise<EntityFileDto[]> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM crm_entity_files WHERE entity_type = $1 AND entity_id = $2::uuid`,
      [params.entityType, params.entityId],
    )

    for (const file of params.files) {
      await client.query(
        `INSERT INTO crm_entity_files (
          entity_type, entity_id, entity_label_snapshot, file_name,
          size_bytes, mime_type, storage_key, uploaded_by_id, uploaded_by_name
        ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)`,
        [
          params.entityType,
          params.entityId,
          params.entityLabel,
          file.name,
          file.size,
          file.mimeType ?? null,
          file.storageKey,
          params.uploadedById ?? null,
          file.uploadedByName ?? params.uploadedByName ?? null,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return listEntityFiles(params.entityType, params.entityId)
}

export async function deleteEntityFile(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM crm_entity_files WHERE id = $1::uuid`,
    [id],
  )
  return (result.rowCount ?? 0) > 0
}
