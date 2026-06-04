-- Añade región y comuna a bodegas (requerido para compras y entregas).
ALTER TABLE crm_warehouses
  ADD COLUMN IF NOT EXISTS region VARCHAR(128),
  ADD COLUMN IF NOT EXISTS commune VARCHAR(128);
