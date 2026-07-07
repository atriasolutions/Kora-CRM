-- RUT del titular en cuentas bancarias de la organización.

BEGIN;

ALTER TABLE crm_organization_bank_accounts
  ADD COLUMN IF NOT EXISTS rut VARCHAR(32) NOT NULL DEFAULT '';

COMMIT;
