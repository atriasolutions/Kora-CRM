-- Descripción de producto en catálogo (editable desde la ficha).

ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS description TEXT;
