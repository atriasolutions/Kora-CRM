-- Al eliminar un reporte, borrar también su historial de ejecuciones (crm_report_runs).
-- Ejecutar en instalaciones existentes donde la FK estaba como RESTRICT.

ALTER TABLE crm_report_runs
  DROP CONSTRAINT IF EXISTS crm_report_runs_report_id_fkey;

ALTER TABLE crm_report_runs
  ADD CONSTRAINT crm_report_runs_report_id_fkey
  FOREIGN KEY (report_id)
  REFERENCES crm_reports(id)
  ON DELETE CASCADE;
