-- Corrige líneas CLP donde unit_price_original ≥ 1.000.000 se guardó como
-- unit_price_cents sin ×100 (bug parseMoneyToCents > 999_999).

UPDATE crm_quote_line_items
SET
  unit_price_cents = ROUND(unit_price_original * 100),
  total_cents = ROUND(
    quantity * ROUND(unit_price_original * 100) * (100 - COALESCE(discount_pct, 0)) / 100.0
  )
WHERE COALESCE(price_currency, 'CLP') = 'CLP'
  AND unit_price_original IS NOT NULL
  AND unit_price_original > 999999
  AND ABS(unit_price_cents - unit_price_original) < 0.01;

UPDATE crm_invoice_line_items
SET
  unit_price_cents = ROUND(unit_price_original * 100),
  total_cents = ROUND(
    quantity * ROUND(unit_price_original * 100) * (100 - COALESCE(discount_pct, 0)) / 100.0
  )
WHERE COALESCE(price_currency, 'CLP') = 'CLP'
  AND unit_price_original IS NOT NULL
  AND unit_price_original > 999999
  AND ABS(unit_price_cents - unit_price_original) < 0.01;

UPDATE crm_purchase_line_items
SET
  unit_price_cents = ROUND(unit_price_original * 100),
  total_cents = ROUND(
    quantity * ROUND(unit_price_original * 100) * (100 - COALESCE(discount_pct, 0)) / 100.0
  )
WHERE COALESCE(price_currency, 'CLP') = 'CLP'
  AND unit_price_original IS NOT NULL
  AND unit_price_original > 999999
  AND ABS(unit_price_cents - unit_price_original) < 0.01;

UPDATE crm_boleta_line_items
SET
  unit_price_cents = ROUND(unit_price_original * 100),
  total_cents = ROUND(
    quantity * ROUND(unit_price_original * 100) * (100 - COALESCE(discount_pct, 0)) / 100.0
  )
WHERE COALESCE(price_currency, 'CLP') = 'CLP'
  AND unit_price_original IS NOT NULL
  AND unit_price_original > 999999
  AND ABS(unit_price_cents - unit_price_original) < 0.01;
