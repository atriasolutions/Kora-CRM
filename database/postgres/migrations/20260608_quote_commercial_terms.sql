-- Condiciones comerciales persistidas en cotizaciones (PDF y ficha).
ALTER TABLE crm_quotes
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_terms VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS terms TEXT NOT NULL DEFAULT '';
