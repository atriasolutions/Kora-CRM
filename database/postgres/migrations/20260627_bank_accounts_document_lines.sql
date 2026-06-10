-- Cuentas bancarias por tenant + campos en cotizaciones/facturas (líneas y PDF).

BEGIN;

CREATE TABLE IF NOT EXISTS crm_organization_bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES crm_tenants(id) ON DELETE CASCADE,
  account_name    VARCHAR(255) NOT NULL DEFAULT '',
  bank_code       VARCHAR(64) NOT NULL DEFAULT '',
  bank_name       VARCHAR(255) NOT NULL DEFAULT '',
  account_type    VARCHAR(64) NOT NULL DEFAULT '',
  account_number  VARCHAR(64) NOT NULL DEFAULT '',
  email           VARCHAR(255) NOT NULL DEFAULT '',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_quotes
  ADD COLUMN IF NOT EXISTS include_bank_details BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES crm_organization_bank_accounts(id) ON DELETE SET NULL;

ALTER TABLE crm_quote_line_items
  ADD COLUMN IF NOT EXISTS subject_to_vat BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deferred_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deferred_payment_text TEXT;

ALTER TABLE crm_invoice_line_items
  ADD COLUMN IF NOT EXISTS subject_to_vat BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deferred_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deferred_payment_text TEXT;

ALTER TABLE crm_organization_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_organization_bank_accounts_tenant_isolation ON crm_organization_bank_accounts;
CREATE POLICY crm_organization_bank_accounts_tenant_isolation ON crm_organization_bank_accounts
  FOR ALL USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  ) WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

COMMIT;
