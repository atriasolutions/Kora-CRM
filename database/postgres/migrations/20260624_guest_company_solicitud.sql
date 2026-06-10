-- Empresa de cliente invitado (membership), vínculo en solicitudes y bitácora.

BEGIN;

ALTER TABLE crm_tenant_memberships
  ADD COLUMN IF NOT EXISTS guest_company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_company_name VARCHAR(255);

ALTER TABLE crm_solicitudes
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS crm_solicitudes_tenant_company_idx
  ON crm_solicitudes (tenant_id, company_id);

ALTER TABLE crm_bitacora_entries
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS crm_bitacora_tenant_company_idx
  ON crm_bitacora_entries (tenant_id, company_id);

COMMIT;
