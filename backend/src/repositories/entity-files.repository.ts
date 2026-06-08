import { pool } from '../db/pool.js'
import { setTenantLocal, tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapEntityFileRow,
  type EntityFileRow,
} from '../mappers/entity-file.mapper.js'
import type { EntityFileDto } from '../types/entity-file.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPersistedFileId(id: string | null | undefined): id is string {
  return !!id && UUID_RE.test(id)
}

export async function ensureEntityFilesTable(): Promise<void> {
  await tenantQuery(`
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
  await tenantQuery(`
    CREATE INDEX IF NOT EXISTS idx_crm_entity_files_entity
      ON crm_entity_files (entity_type, entity_id)
  `)
}

export async function listEntityFiles(
  entityType: string,
  entityId: string,
): Promise<EntityFileDto[]> {
  const result = await tenantQuery<EntityFileRow>(
    `SELECT id, entity_type, entity_id, entity_label_snapshot, file_name,
            size_bytes, mime_type, storage_key, uploaded_at,
            uploaded_by_id, uploaded_by_name
     FROM crm_entity_files
     WHERE entity_type = $1 AND entity_id = $2::uuid AND ${tenantWhereParam(3)}
     ORDER BY uploaded_at DESC`,
    [entityType, entityId, getTenantIdOrDefault()],
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
    id?: string | null
    name: string
    size: number
    mimeType?: string
    storageKey: string
    uploadedByName?: string | null
  }>
}): Promise<EntityFileDto[]> {
  const client = await pool.connect()
  const tenantId = getTenantIdOrDefault()
  const keptIds: string[] = []

  try {
    await client.query('BEGIN')
    await setTenantLocal(client)

    for (const file of params.files) {
      const uploadedByName = file.uploadedByName ?? params.uploadedByName ?? null

      if (isPersistedFileId(file.id)) {
        const updated = await client.query<{ id: string }>(
          `UPDATE crm_entity_files SET
            entity_label_snapshot = $3,
            file_name = $4,
            size_bytes = $5,
            mime_type = $6,
            storage_key = $7,
            uploaded_by_id = COALESCE($8, uploaded_by_id),
            uploaded_by_name = COALESCE($9, uploaded_by_name)
          WHERE id = $10::uuid
            AND entity_type = $1
            AND entity_id = $2::uuid
            AND tenant_id = $11
          RETURNING id`,
          [
            params.entityType,
            params.entityId,
            params.entityLabel,
            file.name,
            file.size,
            file.mimeType ?? null,
            file.storageKey,
            params.uploadedById ?? null,
            uploadedByName,
            file.id,
            tenantId,
          ],
        )

        if ((updated.rowCount ?? 0) === 0) {
          await client.query(
            `INSERT INTO crm_entity_files (
              id, entity_type, entity_id, entity_label_snapshot, file_name,
              size_bytes, mime_type, storage_key, uploaded_by_id, uploaded_by_name, tenant_id
            ) VALUES ($10::uuid, $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $11)`,
            [
              params.entityType,
              params.entityId,
              params.entityLabel,
              file.name,
              file.size,
              file.mimeType ?? null,
              file.storageKey,
              params.uploadedById ?? null,
              uploadedByName,
              file.id,
              tenantId,
            ],
          )
        }

        keptIds.push(file.id)
        continue
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO crm_entity_files (
          entity_type, entity_id, entity_label_snapshot, file_name,
          size_bytes, mime_type, storage_key, uploaded_by_id, uploaded_by_name, tenant_id
        ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          params.entityType,
          params.entityId,
          params.entityLabel,
          file.name,
          file.size,
          file.mimeType ?? null,
          file.storageKey,
          params.uploadedById ?? null,
          uploadedByName,
          tenantId,
        ],
      )
      keptIds.push(inserted.rows[0]!.id)
    }

    if (keptIds.length > 0) {
      await client.query(
        `DELETE FROM crm_entity_files
         WHERE entity_type = $1
           AND entity_id = $2::uuid
           AND tenant_id = $3
           AND NOT (id = ANY($4::uuid[]))`,
        [params.entityType, params.entityId, tenantId, keptIds],
      )
    } else {
      await client.query(
        `DELETE FROM crm_entity_files
         WHERE entity_type = $1 AND entity_id = $2::uuid AND tenant_id = $3`,
        [params.entityType, params.entityId, tenantId],
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
  const result = await tenantQuery(
    `DELETE FROM crm_entity_files WHERE id = $1::uuid AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  return (result.rowCount ?? 0) > 0
}
