-- Visibilidad de productos en API de integración (catálogo externo por tenant).

ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS publish_in_integration BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS publish_price_in_integration BOOLEAN NOT NULL DEFAULT true;
