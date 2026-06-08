-- Fase 0: modo facturación manual/SII, campos DTE, unicidad número por tenant
BEGIN;

ALTER TABLE crm_organization_settings
  ADD COLUMN IF NOT EXISTS invoicing_mode VARCHAR(16) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS economic_activity_code INTEGER;

ALTER TABLE crm_organization_settings
  DROP CONSTRAINT IF EXISTS crm_organization_settings_invoicing_mode_chk;

ALTER TABLE crm_organization_settings
  ADD CONSTRAINT crm_organization_settings_invoicing_mode_chk
  CHECK (invoicing_mode IN ('manual', 'sii'));

ALTER TABLE crm_invoices
  ADD COLUMN IF NOT EXISTS dte_type SMALLINT,
  ADD COLUMN IF NOT EXISTS sii_track_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS dte_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS dte_xml TEXT,
  ADD COLUMN IF NOT EXISTS sii_emitted_at TIMESTAMPTZ;

ALTER TABLE crm_invoices
  DROP CONSTRAINT IF EXISTS crm_invoices_dte_status_chk;

ALTER TABLE crm_invoices
  ADD CONSTRAINT crm_invoices_dte_status_chk
  CHECK (
    dte_status IS NULL OR dte_status IN (
      'draft', 'signed', 'submitted', 'accepted', 'rejected'
    )
  );

ALTER TABLE crm_invoices DROP CONSTRAINT IF EXISTS crm_invoices_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS crm_invoices_tenant_number_active_uidx
  ON crm_invoices (tenant_id, number)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

COMMIT;
