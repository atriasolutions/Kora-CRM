-- Permite eliminar solicitudes sin borrar bitácoras vinculadas.
-- La referencia (solicitud_id + código/título denormalizado) se conserva como en actividades.

BEGIN;

ALTER TABLE crm_bitacora_entries
  DROP CONSTRAINT IF EXISTS crm_bitacora_entries_solicitud_id_fkey;

COMMIT;
