-- Unicidad por tenant: SKU, RUT empresa/contacto, email contacto (multi-tenant).
BEGIN;

-- Productos: eliminar UNIQUE global de SKU
ALTER TABLE crm_products DROP CONSTRAINT IF EXISTS crm_products_sku_key;

CREATE UNIQUE INDEX IF NOT EXISTS crm_products_tenant_sku_active_uidx
  ON crm_products (tenant_id, lower(trim(sku)))
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL AND trim(sku) <> '';

-- Empresas: RUT/DNI único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS crm_companies_tenant_rut_active_uidx
  ON crm_companies (tenant_id, upper(regexp_replace(rut, '[^0-9K]', '', 'gi')))
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL AND trim(rut) <> '';

-- Contactos: RUT único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_tenant_rut_active_uidx
  ON crm_contacts (tenant_id, upper(regexp_replace(rut, '[^0-9K]', '', 'gi')))
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL AND trim(rut) <> '';

-- Contactos: email único por tenant
CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_tenant_email_active_uidx
  ON crm_contacts (tenant_id, lower(trim(email)))
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL
    AND email IS NOT NULL AND trim(email) <> '';

COMMIT;
