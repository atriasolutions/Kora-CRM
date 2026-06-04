-- Campos de detalle de orden de compra (logística, proveedor, observaciones)

ALTER TABLE crm_purchases
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_delivery DATE,
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES crm_warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supplier_contact_name VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_email VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_phone VARCHAR(64) NOT NULL DEFAULT '';
