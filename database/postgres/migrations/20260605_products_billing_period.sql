ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS billing_period VARCHAR(32);

UPDATE crm_products
SET billing_period = CASE
  WHEN unit_of_measure = 'mes' THEN 'Mensual'
  WHEN unit_of_measure = 'hora' THEN 'Por hora'
  WHEN unit_of_measure IN ('kg', 'unidad') THEN 'Por unidad'
  ELSE 'Único'
END
WHERE billing_period IS NULL OR trim(billing_period) = '';
