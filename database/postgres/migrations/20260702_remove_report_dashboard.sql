-- Elimina reportes tipo tablero y la columna dashboard_config.
UPDATE crm_reports
SET
  template_id = 'tabla-dinamica',
  report_type = 'table',
  dashboard_config = NULL
WHERE template_id = 'tablero'
   OR dashboard_config IS NOT NULL;

DROP INDEX IF EXISTS idx_reports_dashboard_config;

ALTER TABLE crm_reports DROP COLUMN IF EXISTS dashboard_config;
