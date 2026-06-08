-- Descuento global sobre el total de líneas (cotizaciones y facturas)

BEGIN;

ALTER TABLE crm_quotes
  ADD COLUMN IF NOT EXISTS global_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE crm_invoices
  ADD COLUMN IF NOT EXISTS global_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMIT;
