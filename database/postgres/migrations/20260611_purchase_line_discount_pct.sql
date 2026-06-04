-- Descuento por línea en órdenes de compra (alineado con cotizaciones/facturas).
ALTER TABLE crm_purchase_line_items
  ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0;
