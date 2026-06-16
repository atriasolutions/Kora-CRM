-- API keys para integraciones server-to-server (ingesta de leads por tenant).

CREATE TABLE IF NOT EXISTS crm_tenant_integration_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES crm_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Integración leads',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  default_assignee_email TEXT,
  lead_source TEXT NOT NULL DEFAULT 'Integración externa',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT crm_tenant_integration_api_keys_key_hash_unique UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS idx_tenant_integration_api_keys_tenant
  ON crm_tenant_integration_api_keys (tenant_id)
  WHERE active = true;

COMMENT ON TABLE crm_tenant_integration_api_keys IS
  'Claves de API por tenant para POST /api/v1/integrations/leads';
