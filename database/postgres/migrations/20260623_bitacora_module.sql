-- Módulo Bitácora: registro de horas por solicitud

BEGIN;

CREATE TABLE IF NOT EXISTS crm_bitacora_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID,
  solicitud_id          UUID NOT NULL REFERENCES crm_solicitudes(id) ON DELETE RESTRICT,
  solicitud_code        VARCHAR(64) NOT NULL DEFAULT '',
  solicitud_title       VARCHAR(255) NOT NULL DEFAULT '',
  work_date             DATE NOT NULL,
  hours                 NUMERIC(6,1) NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  is_billable           BOOLEAN NOT NULL DEFAULT true,
  non_billable_reason   TEXT,
  assigned_user_id      UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  assigned_user_name    VARCHAR(255) NOT NULL DEFAULT '',
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name       VARCHAR(255),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name       VARCHAR(255),
  CONSTRAINT crm_bitacora_hours_half_step_chk
    CHECK (hours >= 0.5 AND (hours * 2) = trunc(hours * 2)),
  CONSTRAINT crm_bitacora_non_billable_reason_chk
    CHECK (
      (is_billable = true AND (non_billable_reason IS NULL OR btrim(non_billable_reason) = ''))
      OR (is_billable = false AND non_billable_reason IS NOT NULL AND btrim(non_billable_reason) <> '')
    )
);

CREATE INDEX IF NOT EXISTS crm_bitacora_tenant_solicitud_idx
  ON crm_bitacora_entries (tenant_id, solicitud_id);

CREATE INDEX IF NOT EXISTS crm_bitacora_tenant_work_date_idx
  ON crm_bitacora_entries (tenant_id, work_date DESC);

CREATE INDEX IF NOT EXISTS crm_bitacora_tenant_assigned_user_idx
  ON crm_bitacora_entries (tenant_id, assigned_user_id);

ALTER TABLE crm_access_profile_permissions
  DROP CONSTRAINT IF EXISTS crm_app_module_id_check;

ALTER TABLE crm_access_profile_permissions
  ADD CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','actividades','proyectos','solicitudes','bitacora','compras','ingresos',
      'inventario','productos','reportes','usuarios','perfiles','configuracion'
    )
  );

DO $$
DECLARE
  pol_name TEXT := 'crm_bitacora_entries_tenant_isolation';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_bitacora_entries'
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE crm_bitacora_entries ENABLE ROW LEVEL SECURITY';
    EXECUTE format('DROP POLICY IF EXISTS %I ON crm_bitacora_entries', pol_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm_bitacora_entries FOR ALL USING (
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
SELECT p.id, 'bitacora', true, true, true, true, true
FROM crm_access_profiles p
WHERE p.system_key = 'admin' OR p.is_system = true
ON CONFLICT (profile_id, module_id) DO NOTHING;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'bitacora', false, false, false, false, false
FROM crm_access_profiles p
WHERE (p.system_key IS NULL OR p.system_key NOT IN ('admin', 'guest'))
  AND p.is_system = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_access_profile_permissions x
    WHERE x.profile_id = p.id AND x.module_id = 'bitacora'
  );

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'bitacora', true, true, true, true, false
FROM crm_access_profiles p
WHERE p.system_key = 'guest'
ON CONFLICT (profile_id, module_id) DO UPDATE SET
  can_menu = EXCLUDED.can_menu,
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

COMMIT;
