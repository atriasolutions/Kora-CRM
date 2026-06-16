-- Fase 1 SII: tipos documento (factura / NC / ND), referencias DTE y desglose IVA
BEGIN;

ALTER TABLE crm_invoices
  ADD COLUMN IF NOT EXISTS document_kind VARCHAR(16) NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS source_invoice_id UUID REFERENCES crm_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reference_code SMALLINT,
  ADD COLUMN IF NOT EXISTS reference_reason TEXT,
  ADD COLUMN IF NOT EXISTS taxable_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS exempt_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS tax_amount_cents BIGINT;

ALTER TABLE crm_invoices
  DROP CONSTRAINT IF EXISTS crm_invoices_document_kind_chk;

ALTER TABLE crm_invoices
  ADD CONSTRAINT crm_invoices_document_kind_chk
  CHECK (document_kind IN ('invoice', 'credit_note', 'debit_note'));

ALTER TABLE crm_invoices
  DROP CONSTRAINT IF EXISTS crm_invoices_reference_code_chk;

ALTER TABLE crm_invoices
  ADD CONSTRAINT crm_invoices_reference_code_chk
  CHECK (reference_code IS NULL OR reference_code IN (1, 2, 3));

CREATE INDEX IF NOT EXISTS crm_invoices_tenant_source_invoice_idx
  ON crm_invoices (tenant_id, source_invoice_id)
  WHERE source_invoice_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_invoices_tenant_document_kind_idx
  ON crm_invoices (tenant_id, document_kind)
  WHERE deleted_at IS NULL;

COMMIT;
