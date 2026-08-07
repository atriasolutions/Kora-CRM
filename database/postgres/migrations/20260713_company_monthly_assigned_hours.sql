-- Horas mensuales asignadas por cliente (cuota para dashboard de bitácora).
BEGIN;

ALTER TABLE crm_companies
  ADD COLUMN IF NOT EXISTS monthly_assigned_hours NUMERIC(6,1) NULL;

ALTER TABLE crm_companies DROP CONSTRAINT IF EXISTS crm_companies_monthly_assigned_hours_chk;

ALTER TABLE crm_companies
  ADD CONSTRAINT crm_companies_monthly_assigned_hours_chk
  CHECK (
    monthly_assigned_hours IS NULL
    OR (
      monthly_assigned_hours >= 0.5
      AND (monthly_assigned_hours * 2) = trunc(monthly_assigned_hours * 2)
    )
  );

COMMENT ON COLUMN crm_companies.monthly_assigned_hours IS
  'Cuota mensual de horas de bitácora para el cliente; NULL = sin cuota configurada.';

COMMIT;
