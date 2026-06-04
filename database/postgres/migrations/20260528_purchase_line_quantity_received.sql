-- Cantidad recibida por línea de orden de compra (recepción parcial / cumplimiento).
ALTER TABLE crm_purchase_line_items
  ADD COLUMN IF NOT EXISTS quantity_received NUMERIC(12,3) NOT NULL DEFAULT 0;
