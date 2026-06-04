-- Elimina la etapa Lead de empresas (unifica en Prospecto).

UPDATE crm_companies SET lifecycle = 'Prospecto' WHERE lifecycle = 'Lead';

ALTER TYPE crm_company_lifecycle RENAME TO crm_company_lifecycle_old;

CREATE TYPE crm_company_lifecycle AS ENUM ('Prospecto', 'Cliente', 'Proveedor');

ALTER TABLE crm_companies
  ALTER COLUMN lifecycle DROP DEFAULT;

ALTER TABLE crm_companies
  ALTER COLUMN lifecycle TYPE crm_company_lifecycle
  USING lifecycle::text::crm_company_lifecycle;

ALTER TABLE crm_companies
  ALTER COLUMN lifecycle SET DEFAULT 'Prospecto';

DROP TYPE crm_company_lifecycle_old;
