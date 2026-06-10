-- Cuotas y uso por instancia (tenant)

CREATE TABLE IF NOT EXISTS crm_tenant_quotas (
  tenant_id           UUID PRIMARY KEY REFERENCES crm_tenants(id) ON DELETE CASCADE,
  max_active_users    INT,
  max_records_bytes   BIGINT,
  max_files_bytes     BIGINT,
  grace_percent       NUMERIC(5, 2) NOT NULL DEFAULT 10,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS crm_tenant_usage_cache (
  tenant_id           UUID PRIMARY KEY REFERENCES crm_tenants(id) ON DELETE CASCADE,
  seats_used          INT NOT NULL DEFAULT 0,
  records_bytes       BIGINT NOT NULL DEFAULT 0,
  files_bytes         BIGINT NOT NULL DEFAULT 0,
  records_by_module   JSONB NOT NULL DEFAULT '{}'::jsonb,
  files_by_module     JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_tenant_quota_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES crm_tenants(id) ON DELETE CASCADE,
  kind                VARCHAR(16) NOT NULL CHECK (kind IN ('records', 'files', 'seats')),
  level               VARCHAR(16) NOT NULL CHECK (level IN ('warning', 'blocked')),
  triggered_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tenant_quota_events_tenant_kind
  ON crm_tenant_quota_events (tenant_id, kind, triggered_at DESC);
