-- Préstamo de socio en gastos operativos.
BEGIN;

ALTER TABLE crm_expenses
  ADD COLUMN IF NOT EXISTS is_partner_loan BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE crm_expenses
  ADD COLUMN IF NOT EXISTS partner_user_id UUID REFERENCES crm_users(id) ON DELETE SET NULL;

ALTER TABLE crm_expenses
  ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE crm_expenses
  ADD COLUMN IF NOT EXISTS partner_loan_returned BOOLEAN NOT NULL DEFAULT false;

COMMIT;
