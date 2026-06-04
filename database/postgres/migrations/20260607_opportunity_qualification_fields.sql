-- Campos de calificación, canales de contacto y descripción en oportunidades
ALTER TABLE crm_opportunities
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(64) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS decision_maker VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS competitors VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS budget_label VARCHAR(128) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buying_process VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS loss_reason VARCHAR(255);

COMMENT ON COLUMN crm_opportunities.contact_email IS 'Email del contacto (snapshot o captura en alta/edición)';
COMMENT ON COLUMN crm_opportunities.contact_phone IS 'Teléfono del contacto (snapshot o captura en alta/edición)';
COMMENT ON COLUMN crm_opportunities.budget_label IS 'Presupuesto indicado por el cliente (texto libre)';
