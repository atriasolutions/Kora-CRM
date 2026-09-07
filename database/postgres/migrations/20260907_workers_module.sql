-- Módulo Trabajadores (RRHH): fichas de personal, vacaciones y liquidaciones de sueldo.
BEGIN;

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE crm_worker_status AS ENUM ('Activo', 'Licencia', 'Finiquitado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_worker_contract_type AS ENUM ('Indefinido', 'Plazo fijo', 'Honorarios', 'Part-time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_worker_vacation_status AS ENUM ('Pendiente', 'Aprobada', 'Rechazada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabla principal: trabajadores ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_workers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID,
  number                  VARCHAR(64) NOT NULL,
  full_name               VARCHAR(255) NOT NULL DEFAULT '',
  tax_id                  VARCHAR(32) NOT NULL DEFAULT '',
  email                   VARCHAR(255) NOT NULL DEFAULT '',
  phone                   VARCHAR(64) NOT NULL DEFAULT '',
  address                 VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url              TEXT,
  job_title               VARCHAR(255) NOT NULL DEFAULT '',
  business_unit           VARCHAR(255) NOT NULL DEFAULT '',
  job_functions           TEXT,
  status                  crm_worker_status NOT NULL DEFAULT 'Activo',
  contract_type           crm_worker_contract_type NOT NULL DEFAULT 'Indefinido',
  work_hours              INTEGER NOT NULL DEFAULT 45,
  start_date              DATE,
  end_date                DATE,
  base_salary_cents       BIGINT NOT NULL DEFAULT 0,
  gratification_cents     BIGINT NOT NULL DEFAULT 0,
  afp_name                VARCHAR(128) NOT NULL DEFAULT '',
  afp_rate                NUMERIC(6,3) NOT NULL DEFAULT 11.44,
  health_institution      VARCHAR(128) NOT NULL DEFAULT '',
  health_plan             VARCHAR(128) NOT NULL DEFAULT '',
  afc_rate                NUMERIC(6,3) NOT NULL DEFAULT 0.6,
  vacation_adjustment_days NUMERIC(6,2) NOT NULL DEFAULT 0,
  payday_day              INTEGER NOT NULL DEFAULT 5,
  owner_name              VARCHAR(255),
  deleted_at              TIMESTAMPTZ,
  archived_at             TIMESTAMPTZ,
  archived_by_id          UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name         VARCHAR(255),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name         VARCHAR(255),
  CONSTRAINT crm_workers_base_salary_nonneg CHECK (base_salary_cents >= 0),
  CONSTRAINT crm_workers_payday_range CHECK (payday_day BETWEEN 1 AND 28)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_workers_tenant_number_active_uidx
  ON crm_workers (tenant_id, number)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_workers_tenant_status_idx
  ON crm_workers (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_workers_tenant_updated_idx
  ON crm_workers (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ── Solicitudes de vacaciones ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_worker_vacation_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID,
  worker_id               UUID NOT NULL REFERENCES crm_workers(id) ON DELETE CASCADE,
  start_date              DATE NOT NULL,
  end_date                DATE NOT NULL,
  days                    NUMERIC(6,2) NOT NULL DEFAULT 0,
  status                  crm_worker_vacation_status NOT NULL DEFAULT 'Pendiente',
  notes                   TEXT,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name         VARCHAR(255),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name         VARCHAR(255),
  CONSTRAINT crm_worker_vacation_days_nonneg CHECK (days >= 0)
);

CREATE INDEX IF NOT EXISTS crm_worker_vacation_worker_idx
  ON crm_worker_vacation_requests (tenant_id, worker_id)
  WHERE deleted_at IS NULL;

-- ── Liquidaciones de sueldo ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_worker_payrolls (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID,
  worker_id               UUID NOT NULL REFERENCES crm_workers(id) ON DELETE CASCADE,
  period_year             INTEGER NOT NULL,
  period_month            INTEGER NOT NULL,
  days_worked             NUMERIC(6,2) NOT NULL DEFAULT 30,
  days_license            NUMERIC(6,2) NOT NULL DEFAULT 0,
  days_absence            NUMERIC(6,2) NOT NULL DEFAULT 0,
  days_vacation           NUMERIC(6,2) NOT NULL DEFAULT 0,
  uf_value_cents          BIGINT NOT NULL DEFAULT 0,
  earnings_json           JSONB NOT NULL DEFAULT '[]'::jsonb,
  deductions_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  taxable_base_cents      BIGINT NOT NULL DEFAULT 0,
  tax_base_cents          BIGINT NOT NULL DEFAULT 0,
  gross_cents             BIGINT NOT NULL DEFAULT 0,
  net_cents               BIGINT NOT NULL DEFAULT 0,
  overdraft_cents         BIGINT NOT NULL DEFAULT 0,
  paid_at                 TIMESTAMPTZ,
  pdf_path                TEXT,
  -- Snapshot de la ficha del trabajador al momento de generar la liquidación (para el PDF).
  worker_snapshot_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name         VARCHAR(255),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name         VARCHAR(255),
  CONSTRAINT crm_worker_payrolls_period_month_range CHECK (period_month BETWEEN 1 AND 12)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_worker_payrolls_period_uidx
  ON crm_worker_payrolls (tenant_id, worker_id, period_year, period_month)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_worker_payrolls_worker_idx
  ON crm_worker_payrolls (tenant_id, worker_id)
  WHERE deleted_at IS NULL;

-- ── Actividades relacionadas: tipo trabajador ─────────────────────────────────
DO $$ BEGIN
  ALTER TYPE crm_activity_related_type ADD VALUE IF NOT EXISTS 'trabajador';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Permisos: ampliar módulos válidos con 'trabajadores' ──────────────────────
ALTER TABLE crm_access_profile_permissions
  DROP CONSTRAINT IF EXISTS crm_app_module_id_check;

ALTER TABLE crm_access_profile_permissions
  ADD CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','boletas','actividades','proyectos','solicitudes','bitacora',
      'pruebas_solicitud','compras','ingresos','inventario','productos',
      'gastos','trabajadores','reportes','usuarios','perfiles','configuracion'
    )
  );

-- ── RLS por tenant en las tres tablas ─────────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['crm_workers', 'crm_worker_vacation_requests', 'crm_worker_payrolls'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) THEN
      pol_name := tbl || '_tenant_isolation';
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL USING (
          tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
        ) WITH CHECK (
          tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
        )',
        pol_name, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── Permisos por perfil (mismo patrón que el módulo Gastos) ───────────────────
INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'trabajadores', true, true, true, true, true
FROM crm_access_profiles p
WHERE p.system_key = 'admin' OR p.is_system = true
ON CONFLICT (profile_id, module_id) DO NOTHING;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'trabajadores', false, false, false, false, false
FROM crm_access_profiles p
WHERE (p.system_key IS NULL OR p.system_key NOT IN ('admin', 'guest'))
  AND p.is_system = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_access_profile_permissions x
    WHERE x.profile_id = p.id AND x.module_id = 'trabajadores'
  );

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'trabajadores', true, true, true, true, false
FROM crm_access_profiles p
WHERE p.system_key = 'guest'
ON CONFLICT (profile_id, module_id) DO UPDATE SET
  can_menu = EXCLUDED.can_menu,
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

COMMIT;
