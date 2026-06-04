-- Concurrencia en inventario: evita reservas duplicadas por línea de cotización.
-- Ejecutar en bases existentes: psql -f database/postgres/migrations/20260527_stock_concurrency.sql

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_reservation_active_quote_line
  ON crm_stock_reservations (quote_id, quote_line_id)
  WHERE status IN ('active', 'transferred')
    AND quote_line_id IS NOT NULL
    AND quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_reservations_sku_status
  ON crm_stock_reservations (lower(trim(sku)), status)
  WHERE status IN ('active', 'transferred', 'committed');

CREATE INDEX IF NOT EXISTS idx_stock_movements_factura_sku
  ON crm_stock_movements (source_id, lower(trim(sku)), movement_type)
  WHERE source_kind = 'factura';
