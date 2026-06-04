-- Notas por entidad (paridad con crm_entity_files)
CREATE TABLE IF NOT EXISTS crm_entity_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(64) NOT NULL,
  entity_id       UUID NOT NULL,
  body            TEXT NOT NULL,
  mentions        JSONB NOT NULL DEFAULT '[]'::jsonb,
  author_user_id  UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  author_name     VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_entity_notes_entity
  ON crm_entity_notes (entity_type, entity_id, created_at DESC);
