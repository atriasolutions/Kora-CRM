-- URLs externas de comprobantes asociados a gastos.
BEGIN;

ALTER TABLE crm_expenses
  ADD COLUMN IF NOT EXISTS receipt_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE crm_expenses
  DROP CONSTRAINT IF EXISTS crm_expenses_receipt_urls_array_check;

ALTER TABLE crm_expenses
  ADD CONSTRAINT crm_expenses_receipt_urls_array_check
  CHECK (jsonb_typeof(receipt_urls) = 'array');

COMMIT;
