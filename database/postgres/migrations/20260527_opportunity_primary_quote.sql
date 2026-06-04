-- Cotización de referencia para sincronizar monto y líneas con la oportunidad.
ALTER TABLE crm_opportunities
  ADD COLUMN IF NOT EXISTS primary_quote_id UUID REFERENCES crm_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_primary_quote
  ON crm_opportunities(primary_quote_id)
  WHERE primary_quote_id IS NOT NULL;

COMMENT ON COLUMN crm_opportunities.primary_quote_id IS
  'Cotización de referencia; al sincronizar se copian monto (con IVA) y líneas a la oportunidad.';
