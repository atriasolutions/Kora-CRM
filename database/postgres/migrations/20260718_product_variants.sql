-- Variedades de producto: padre (agrupador) + hijos stockeables por SKU.
BEGIN;

ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES crm_products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS variant_options JSONB,
  ADD COLUMN IF NOT EXISTS variant_attributes JSONB;

CREATE INDEX IF NOT EXISTS idx_crm_products_tenant_parent
  ON crm_products (tenant_id, parent_product_id)
  WHERE parent_product_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
