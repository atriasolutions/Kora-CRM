-- Fase 1+: schema SII multi-tenant (compatible con modelo Emisso)
BEGIN;

CREATE SCHEMA IF NOT EXISTS sii;

CREATE TABLE IF NOT EXISTS sii.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  env VARCHAR(16) NOT NULL DEFAULT 'certification',
  label VARCHAR(128),
  cert_base64 TEXT NOT NULL,
  cert_password_encrypted TEXT NOT NULL,
  cert_rut VARCHAR(32),
  cert_expires_at TIMESTAMPTZ,
  portal_rut VARCHAR(32),
  portal_password_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sii_credentials_env_chk CHECK (env IN ('certification', 'production')),
  CONSTRAINT sii_credentials_tenant_env_uq UNIQUE (tenant_id, env)
);

CREATE TABLE IF NOT EXISTS sii.token_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  env VARCHAR(16) NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sii_token_cache_tenant_env_uq UNIQUE (tenant_id, env)
);

CREATE TABLE IF NOT EXISTS sii.settings (
  tenant_id UUID PRIMARY KEY,
  default_env VARCHAR(16) NOT NULL DEFAULT 'certification',
  consent_at TIMESTAMPTZ,
  consent_user_id UUID,
  last_rcv_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sii_settings_env_chk CHECK (default_env IN ('certification', 'production'))
);

CREATE TABLE IF NOT EXISTS sii.folio_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  dte_type SMALLINT NOT NULL,
  range_start BIGINT NOT NULL,
  range_end BIGINT NOT NULL,
  next_folio BIGINT NOT NULL,
  caf_xml_encrypted TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sii_folio_ranges_tenant_type
  ON sii.folio_ranges (tenant_id, dte_type)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS sii.rcv_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  env VARCHAR(16) NOT NULL,
  issue_type VARCHAR(16) NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  dte_type SMALLINT,
  folio BIGINT,
  issuer_rut VARCHAR(32),
  issuer_name VARCHAR(255),
  receiver_rut VARCHAR(32),
  receiver_name VARCHAR(255),
  issue_date DATE,
  net_amount BIGINT,
  tax_amount BIGINT,
  total_amount BIGINT,
  raw_payload JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sii_rcv_issue_type_chk CHECK (issue_type IN ('issued', 'received'))
);

CREATE INDEX IF NOT EXISTS idx_sii_rcv_tenant_period
  ON sii.rcv_invoices (tenant_id, period_year, period_month, issue_type);

CREATE TABLE IF NOT EXISTS sii.dte_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID REFERENCES crm_invoices(id) ON DELETE SET NULL,
  dte_type SMALLINT NOT NULL,
  folio BIGINT,
  track_id VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  payload_hash VARCHAR(64),
  error_message TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by_id UUID,
  submitted_by_name VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sii_dte_submissions_invoice
  ON sii.dte_submissions (tenant_id, invoice_id);

CREATE TABLE IF NOT EXISTS sii.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  job_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  period_year INT,
  period_month INT,
  issue_type VARCHAR(16),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE sii.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sii.token_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sii.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sii.folio_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sii.rcv_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sii.dte_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sii.sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sii_credentials_tenant ON sii.credentials;
CREATE POLICY sii_credentials_tenant ON sii.credentials
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_token_cache_tenant ON sii.token_cache;
CREATE POLICY sii_token_cache_tenant ON sii.token_cache
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_settings_tenant ON sii.settings;
CREATE POLICY sii_settings_tenant ON sii.settings
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_folio_ranges_tenant ON sii.folio_ranges;
CREATE POLICY sii_folio_ranges_tenant ON sii.folio_ranges
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_rcv_invoices_tenant ON sii.rcv_invoices;
CREATE POLICY sii_rcv_invoices_tenant ON sii.rcv_invoices
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_dte_submissions_tenant ON sii.dte_submissions;
CREATE POLICY sii_dte_submissions_tenant ON sii.dte_submissions
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_sync_jobs_tenant ON sii.sync_jobs;
CREATE POLICY sii_sync_jobs_tenant ON sii.sync_jobs
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- Escritura scoped por tenant (provisioning vía platformQuery usa bypass o SET LOCAL)
DROP POLICY IF EXISTS sii_credentials_insert ON sii.credentials;
CREATE POLICY sii_credentials_insert ON sii.credentials FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS sii_credentials_update ON sii.credentials;
CREATE POLICY sii_credentials_update ON sii.credentials FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_settings_insert ON sii.settings;
CREATE POLICY sii_settings_insert ON sii.settings FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS sii_settings_update ON sii.settings;
CREATE POLICY sii_settings_update ON sii.settings FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_folio_ranges_insert ON sii.folio_ranges;
CREATE POLICY sii_folio_ranges_insert ON sii.folio_ranges FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS sii_folio_ranges_update ON sii.folio_ranges;
CREATE POLICY sii_folio_ranges_update ON sii.folio_ranges FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_rcv_insert ON sii.rcv_invoices;
CREATE POLICY sii_rcv_insert ON sii.rcv_invoices FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS sii_rcv_delete ON sii.rcv_invoices;
CREATE POLICY sii_rcv_delete ON sii.rcv_invoices FOR DELETE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_dte_submissions_insert ON sii.dte_submissions;
CREATE POLICY sii_dte_submissions_insert ON sii.dte_submissions FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS sii_dte_submissions_update ON sii.dte_submissions;
CREATE POLICY sii_dte_submissions_update ON sii.dte_submissions FOR UPDATE
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS sii_sync_jobs_insert ON sii.sync_jobs;
CREATE POLICY sii_sync_jobs_insert ON sii.sync_jobs FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

COMMIT;
