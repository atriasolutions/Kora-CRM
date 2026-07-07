-- Marca de producto en catálogo (editable desde la ficha y al crear).

ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS brand TEXT;
