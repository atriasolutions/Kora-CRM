-- Campos de ficha y actividad por instancia (tenant), sin mezclar datos globales del usuario.

BEGIN;

ALTER TABLE crm_tenant_memberships
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(64),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(64),
  ADD COLUMN IF NOT EXISTS department VARCHAR(255),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE crm_user_sessions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_crm_user_sessions_user_tenant
  ON crm_user_sessions (user_id, tenant_id, occurred_at DESC);

COMMIT;
