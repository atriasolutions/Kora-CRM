-- Multi-tenant platform: tenants, memberships, backfill Atria Solutions
-- Ejecutar tras pg_dump de respaldo. No TRUNCATE ni DROP.

BEGIN;

CREATE TYPE crm_tenant_status AS ENUM (
  'active',
  'suspended',
  'provisioning',
  'deleted'
);

CREATE TYPE crm_tenant_kind AS ENUM (
  'production',
  'trial',
  'internal'
);

CREATE TYPE crm_membership_status AS ENUM (
  'active',
  'invited',
  'disabled'
);

CREATE TABLE IF NOT EXISTS crm_tenants (
  id              UUID PRIMARY KEY,
  slug            VARCHAR(64) NOT NULL UNIQUE,
  display_name    VARCHAR(255) NOT NULL,
  logo_url        TEXT,
  status          crm_tenant_status NOT NULL DEFAULT 'active',
  kind            crm_tenant_kind NOT NULL DEFAULT 'production',
  plan            VARCHAR(64),
  trial_ends_at   TIMESTAMPTZ,
  purge_after_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_tenant_memberships (
  tenant_id   UUID NOT NULL REFERENCES crm_tenants(id) ON DELETE RESTRICT,
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE RESTRICT,
  profile_id  UUID NOT NULL REFERENCES crm_access_profiles(id) ON DELETE RESTRICT,
  status      crm_membership_status NOT NULL DEFAULT 'active',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user
  ON crm_tenant_memberships (user_id);

-- Tenant Atria Solutions (producción actual)
INSERT INTO crm_tenants (id, slug, display_name, status, kind, plan)
VALUES (
  'a0000001-0001-4001-8001-000000000001',
  'atriasolutions',
  'Atria Solutions',
  'active',
  'production',
  'production'
)
ON CONFLICT (id) DO NOTHING;

-- Columnas tenant en tablas de plataforma / catálogo sin tenant_id
ALTER TABLE crm_access_profiles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_report_folders
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_reports
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_user_auth_sessions
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_entity_notes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_entity_files
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_entity_journey_states
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_archived_records
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_recent_views
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

ALTER TABLE crm_saved_segments
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_notifications'
  ) THEN
    EXECUTE 'ALTER TABLE crm_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_exchange_rates'
  ) THEN
    EXECUTE 'ALTER TABLE crm_exchange_rates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES crm_tenants(id) ON DELETE RESTRICT';
  END IF;
END $$;

-- Backfill tenant_id en todas las tablas public.crm_* que tengan la columna
DO $$
DECLARE
  r RECORD;
  atria UUID := 'a0000001-0001-4001-8001-000000000001';
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name LIKE 'crm\_%'
      AND c.column_name = 'tenant_id'
      AND c.table_name NOT IN ('crm_tenants', 'crm_tenant_memberships')
  LOOP
    EXECUTE format(
      'UPDATE %I SET tenant_id = $1 WHERE tenant_id IS NULL',
      r.table_name
    ) USING atria;
  END LOOP;
END $$;

-- Membresías: cada usuario activo → tenant Atria con su profile_id actual
INSERT INTO crm_tenant_memberships (tenant_id, user_id, profile_id, status, is_default)
SELECT
  'a0000001-0001-4001-8001-000000000001',
  u.id,
  u.profile_id,
  CASE
    WHEN u.status = 'Activo' THEN 'active'::crm_membership_status
    WHEN u.status = 'Invitado' OR u.status = 'Por verificar' THEN 'invited'::crm_membership_status
    ELSE 'disabled'::crm_membership_status
  END,
  true
FROM crm_users u
WHERE u.deleted_at IS NULL
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Logo tenant desde organization_settings si existe
UPDATE crm_tenants t
SET logo_url = os.logo_url,
    display_name = COALESCE(NULLIF(os.trade_name, ''), NULLIF(os.legal_name, ''), t.display_name)
FROM crm_organization_settings os
WHERE t.id = 'a0000001-0001-4001-8001-000000000001'
  AND os.tenant_id = t.id;

COMMIT;
