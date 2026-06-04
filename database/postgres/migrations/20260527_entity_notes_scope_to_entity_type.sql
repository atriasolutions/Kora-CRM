-- Migra crm_entity_notes del esquema antiguo (scope enum) al actual (entity_type).
-- Idempotente: seguro ejecutar más de una vez.

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

CREATE INDEX IF NOT EXISTS idx_crm_entity_notes_entity
  ON crm_entity_notes (entity_type, entity_id, created_at DESC);
