-- Origen comercial alternativo: solicitud (además de oportunidad/cotización)

BEGIN;

ALTER TABLE crm_projects
  ADD COLUMN IF NOT EXISTS solicitud_id UUID REFERENCES crm_solicitudes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS solicitud_code VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS solicitud_title VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS crm_projects_solicitud_id_idx
  ON crm_projects (tenant_id, solicitud_id)
  WHERE solicitud_id IS NOT NULL;

COMMIT;
