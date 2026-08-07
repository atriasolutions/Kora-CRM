-- Módulo Gastos: egresos operativos de la empresa (arriendo, sueldos, impuestos, etc.)
BEGIN;

DO $$ BEGIN
  CREATE TYPE crm_expense_status AS ENUM ('Borrador', 'Registrado', 'Anulado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crm_expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID,
  number                VARCHAR(64) NOT NULL,
  concept               VARCHAR(255) NOT NULL DEFAULT '',
  category              VARCHAR(64) NOT NULL DEFAULT 'Otros',
  expense_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_cents          BIGINT NOT NULL DEFAULT 0,
  currency              VARCHAR(8) NOT NULL DEFAULT 'CLP',
  payment_method        VARCHAR(64) NOT NULL DEFAULT 'Transferencia',
  status                crm_expense_status NOT NULL DEFAULT 'Registrado',
  supplier_id           UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  supplier_name         VARCHAR(255) NOT NULL DEFAULT '',
  notes                 TEXT,
  owner_user_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name            VARCHAR(255),
  deleted_at            TIMESTAMPTZ,
  archived_at           TIMESTAMPTZ,
  archived_by_id        UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name       VARCHAR(255),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name       VARCHAR(255),
  CONSTRAINT crm_expenses_amount_nonneg CHECK (amount_cents >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_expenses_tenant_number_active_uidx
  ON crm_expenses (tenant_id, number)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_expenses_tenant_date_idx
  ON crm_expenses (tenant_id, expense_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_expenses_tenant_category_idx
  ON crm_expenses (tenant_id, category)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_expenses_tenant_status_idx
  ON crm_expenses (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_expenses_tenant_updated_idx
  ON crm_expenses (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

DO $$ BEGIN
  ALTER TYPE crm_activity_related_type ADD VALUE IF NOT EXISTS 'gasto';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE crm_access_profile_permissions
  DROP CONSTRAINT IF EXISTS crm_app_module_id_check;

ALTER TABLE crm_access_profile_permissions
  ADD CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','boletas','actividades','proyectos','solicitudes','bitacora',
      'pruebas_solicitud','compras','ingresos','inventario','productos',
      'gastos','reportes','usuarios','perfiles','configuracion'
    )
  );

DO $$
DECLARE
  pol_name TEXT := 'crm_expenses_tenant_isolation';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_expenses'
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE crm_expenses ENABLE ROW LEVEL SECURITY';
    EXECUTE format('DROP POLICY IF EXISTS %I ON crm_expenses', pol_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm_expenses FOR ALL USING (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      ) WITH CHECK (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      )',
      pol_name
    );
  END IF;
END $$;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'gastos', true, true, true, true, true
FROM crm_access_profiles p
WHERE p.system_key = 'admin' OR p.is_system = true
ON CONFLICT (profile_id, module_id) DO NOTHING;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'gastos', false, false, false, false, false
FROM crm_access_profiles p
WHERE (p.system_key IS NULL OR p.system_key NOT IN ('admin', 'guest'))
  AND p.is_system = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_access_profile_permissions x
    WHERE x.profile_id = p.id AND x.module_id = 'gastos'
  );

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'gastos', true, true, true, true, false
FROM crm_access_profiles p
WHERE p.system_key = 'guest'
ON CONFLICT (profile_id, module_id) DO UPDATE SET
  can_menu = EXCLUDED.can_menu,
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

COMMIT;
