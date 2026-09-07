-- Estado de pago en compras (CxP) para informe EE.FF.
BEGIN;

DO $$ BEGIN
  CREATE TYPE crm_purchase_payment_status AS ENUM ('Pendiente', 'Pagada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE crm_purchases
  ADD COLUMN IF NOT EXISTS payment_status crm_purchase_payment_status NOT NULL DEFAULT 'Pendiente',
  ADD COLUMN IF NOT EXISTS paid_at DATE;

-- Compras ya confirmadas/emitidas quedan Pendiente de pago por defecto (ya es el default).
-- Borradores también Pendiente (no entran al CxP del informe).

CREATE INDEX IF NOT EXISTS crm_purchases_tenant_payment_status_idx
  ON crm_purchases (tenant_id, payment_status)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

COMMIT;
