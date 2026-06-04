-- Tipos de cambio diarios (mindicador.cl) y soporte multi-moneda en productos y documentos.

CREATE TABLE IF NOT EXISTS crm_exchange_rates (
  rate_date   DATE PRIMARY KEY,
  uf_clp      NUMERIC(18, 6) NOT NULL,
  usd_clp     NUMERIC(18, 6) NOT NULL,
  eur_clp     NUMERIC(18, 6) NOT NULL,
  source      TEXT NOT NULL DEFAULT 'mindicador.cl',
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(18, 6);

UPDATE crm_products
SET price_amount = price_cents / 100.0
WHERE price_amount IS NULL;

ALTER TABLE crm_quotes
  ADD COLUMN IF NOT EXISTS exchange_rate_uf NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_usd NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_eur NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;

ALTER TABLE crm_invoices
  ADD COLUMN IF NOT EXISTS exchange_rate_uf NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_usd NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_eur NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;

ALTER TABLE crm_purchases
  ADD COLUMN IF NOT EXISTS exchange_rate_uf NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_usd NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_eur NUMERIC(18, 6),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;

ALTER TABLE crm_quote_line_items
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS unit_price_original NUMERIC(18, 6);

ALTER TABLE crm_invoice_line_items
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS unit_price_original NUMERIC(18, 6);

ALTER TABLE crm_purchase_line_items
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(3) NOT NULL DEFAULT 'CLP',
  ADD COLUMN IF NOT EXISTS unit_price_original NUMERIC(18, 6);
