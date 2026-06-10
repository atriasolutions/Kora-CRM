import { tenantQuery } from '../db/tenant-query.js'
import { enforceRecordQuota } from '../lib/tenant-quota-enforce.js'
import {
  tenantUserDisplayNameSql,
  tenantUserMembershipJoins,
} from '../lib/tenant-user-display-name-sql.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapEntityNoteRow,
  type EntityNoteRow,
} from '../mappers/entity-note.mapper.js'
import type {
  CreateEntityNoteInput,
  EntityNoteDto,
  EntityNoteMentionDto,
} from '../types/entity-note.js'
import { notFound } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'

export async function ensureEntityNotesTable(): Promise<void> {
  await tenantQuery(`
    CREATE TABLE IF NOT EXISTS crm_entity_notes (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type     VARCHAR(64) NOT NULL,
      entity_id       UUID NOT NULL,
      body            TEXT NOT NULL,
      mentions        JSONB NOT NULL DEFAULT '[]'::jsonb,
      author_user_id  UUID REFERENCES crm_users(id) ON DELETE SET NULL,
      author_name     VARCHAR(255) NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await tenantQuery(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'crm_entity_notes'
          AND column_name = 'scope'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'crm_entity_notes'
          AND column_name = 'entity_type'
      ) THEN
        ALTER TABLE crm_entity_notes ADD COLUMN entity_type VARCHAR(64);
        UPDATE crm_entity_notes
        SET entity_type = CASE scope::text
          WHEN 'ingreso' THEN 'recepcion'
          ELSE scope::text
        END;
        ALTER TABLE crm_entity_notes ALTER COLUMN entity_type SET NOT NULL;
        ALTER TABLE crm_entity_notes DROP COLUMN scope;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'crm_entity_notes'
          AND column_name = 'mentions'
          AND is_nullable = 'YES'
      ) THEN
        UPDATE crm_entity_notes SET mentions = '[]'::jsonb WHERE mentions IS NULL;
        ALTER TABLE crm_entity_notes
          ALTER COLUMN mentions SET DEFAULT '[]'::jsonb,
          ALTER COLUMN mentions SET NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'crm_entity_notes'
          AND column_name = 'author_name'
          AND is_nullable = 'YES'
      ) THEN
        UPDATE crm_entity_notes SET author_name = '' WHERE author_name IS NULL;
        ALTER TABLE crm_entity_notes ALTER COLUMN author_name SET NOT NULL;
      END IF;
    END $$;
  `)

  await tenantQuery(`
    CREATE INDEX IF NOT EXISTS idx_crm_entity_notes_entity
      ON crm_entity_notes (entity_type, entity_id, created_at DESC)
  `)
}

export async function listEntityNotes(
  entityType: string,
  entityId: string,
): Promise<EntityNoteDto[]> {
  const tenantId = getTenantIdOrDefault()
  const result = await tenantQuery<EntityNoteRow>(
    `SELECT n.id, n.entity_type, n.entity_id, n.body, n.mentions,
            n.author_user_id,
            ${tenantUserDisplayNameSql('n.author_name')} AS author_name,
            n.created_at
     FROM crm_entity_notes n
     ${tenantUserMembershipJoins('n.author_user_id', 4)}
     WHERE n.entity_type = $1 AND n.entity_id = $2::uuid AND ${tenantWhereParam(3, 'n')}
     ORDER BY n.created_at DESC`,
    [entityType, entityId, tenantId, tenantId],
  )
  return result.rows.map(mapEntityNoteRow)
}

export async function createEntityNote(
  input: CreateEntityNoteInput,
  actor: AuditActor,
): Promise<EntityNoteDto> {
  await enforceRecordQuota(actor)
  const mentions: EntityNoteMentionDto[] = input.mentions ?? []
  const result = await tenantQuery<EntityNoteRow>(
    `INSERT INTO crm_entity_notes (
      entity_type, entity_id, body, mentions,
      author_user_id, author_name, tenant_id
    ) VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7)
    RETURNING id, entity_type, entity_id, body, mentions,
              author_user_id, author_name, created_at`,
    [
      input.entityType,
      input.entityId,
      input.body,
      JSON.stringify(mentions),
      actor.userId,
      actor.userName,
      getTenantIdOrDefault(),
    ],
  )
  const row = result.rows[0]
  if (!row) throw new Error('No se pudo crear la nota')
  return mapEntityNoteRow(row)
}

export type EntityNoteDeleteContext = {
  entity_type: string
  author_user_id: string | null
}

export async function getEntityNoteDeleteContext(
  id: string,
): Promise<EntityNoteDeleteContext | null> {
  const result = await tenantQuery<EntityNoteDeleteContext>(
    `SELECT entity_type, author_user_id
     FROM crm_entity_notes
     WHERE id = $1::uuid AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  return result.rows[0] ?? null
}

export async function deleteEntityNote(id: string): Promise<void> {
  const result = await tenantQuery(
    `DELETE FROM crm_entity_notes WHERE id = $1::uuid AND ${tenantWhereParam(2)}`,
    [id, getTenantIdOrDefault()],
  )
  if ((result.rowCount ?? 0) === 0) throw notFound('Nota no encontrada')
}
