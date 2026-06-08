-- El código de bodega debe ser único por tenant, no global (multi-tenant).
BEGIN;

ALTER TABLE crm_warehouses DROP CONSTRAINT IF EXISTS crm_warehouses_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS crm_warehouses_tenant_code_active_uidx
  ON crm_warehouses (tenant_id, code)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

COMMIT;
