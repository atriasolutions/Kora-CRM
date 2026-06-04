-- Flujo OC: Borrador → Emitida → Confirmada (reemplaza estados de recepción)

ALTER TYPE crm_purchase_status RENAME TO crm_purchase_status_old;

CREATE TYPE crm_purchase_status AS ENUM ('Borrador', 'Emitida', 'Confirmada');

ALTER TABLE crm_purchases
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE crm_purchases
  ALTER COLUMN status TYPE crm_purchase_status
  USING (
    CASE status::text
      WHEN 'Recibida' THEN 'Confirmada'
      WHEN 'Parcial' THEN 'Emitida'
      WHEN 'Pendiente' THEN 'Emitida'
      WHEN 'En espera proveedor' THEN 'Emitida'
      WHEN 'Cancelada' THEN 'Borrador'
      ELSE 'Borrador'
    END
  )::crm_purchase_status;

ALTER TABLE crm_purchases
  ALTER COLUMN status SET DEFAULT 'Borrador';

DROP TYPE crm_purchase_status_old;
