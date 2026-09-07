-- Ampliar categoría (varchar ya flexible) + tipo/folio documento + backfill homologación
BEGIN;

ALTER TABLE crm_expenses
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document_folio VARCHAR(64) NOT NULL DEFAULT '';

-- Homologación suave: Retiros → Retiros Socios
UPDATE crm_expenses
SET category = 'Retiros Socios', updated_at = now()
WHERE deleted_at IS NULL AND category = 'Retiros';

-- Transporte con viático/vuelo → Viáticos
UPDATE crm_expenses
SET category = 'Viáticos', updated_at = now()
WHERE deleted_at IS NULL
  AND category = 'Transporte'
  AND (
    concept ILIKE '%viático%'
    OR concept ILIKE '%viatico%'
    OR concept ILIKE '%vuelo%'
  );

COMMIT;
