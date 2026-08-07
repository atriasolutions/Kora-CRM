-- Módulo Pruebas de Solicitud: cabecera + casos de prueba

BEGIN;

CREATE TABLE IF NOT EXISTS crm_solicitud_pruebas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  code              VARCHAR(64) NOT NULL,
  solicitud_id      UUID NOT NULL REFERENCES crm_solicitudes(id) ON DELETE RESTRICT,
  solicitud_code    VARCHAR(64) NOT NULL DEFAULT '',
  solicitud_title   VARCHAR(255) NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  executed_at       DATE,
  deleted_at        TIMESTAMPTZ,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name   VARCHAR(255),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name   VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_solicitud_pruebas_tenant_code_uidx
  ON crm_solicitud_pruebas (tenant_id, code);

CREATE INDEX IF NOT EXISTS crm_solicitud_pruebas_tenant_solicitud_idx
  ON crm_solicitud_pruebas (tenant_id, solicitud_id);

CREATE INDEX IF NOT EXISTS crm_solicitud_pruebas_tenant_executed_idx
  ON crm_solicitud_pruebas (tenant_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS crm_solicitud_prueba_casos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prueba_id           UUID NOT NULL REFERENCES crm_solicitud_pruebas(id) ON DELETE CASCADE,
  code                VARCHAR(64) NOT NULL,
  sort_order          INT NOT NULL DEFAULT 0,
  short_description   TEXT NOT NULL DEFAULT '',
  input_data          TEXT NOT NULL DEFAULT '',
  steps               TEXT NOT NULL DEFAULT '',
  expected_result     TEXT NOT NULL DEFAULT '',
  obtained_result     TEXT NOT NULL DEFAULT '',
  executor_ok         BOOLEAN,
  executor_notes      TEXT NOT NULL DEFAULT '',
  executor_ok_at      TIMESTAMPTZ,
  evidence_html       TEXT NOT NULL DEFAULT '',
  client_ok           BOOLEAN,
  client_notes        TEXT NOT NULL DEFAULT '',
  client_ok_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_solicitud_prueba_casos_prueba_code_uidx
  ON crm_solicitud_prueba_casos (prueba_id, code);

CREATE INDEX IF NOT EXISTS crm_solicitud_prueba_casos_prueba_sort_idx
  ON crm_solicitud_prueba_casos (prueba_id, sort_order);

ALTER TABLE crm_access_profile_permissions
  DROP CONSTRAINT IF EXISTS crm_app_module_id_check;

ALTER TABLE crm_access_profile_permissions
  ADD CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','actividades','proyectos','solicitudes','bitacora',
      'pruebas_solicitud','compras','ingresos','inventario','productos',
      'reportes','usuarios','perfiles','configuracion'
    )
  );

DO $$
DECLARE
  pol_name TEXT;
BEGIN
  pol_name := 'crm_solicitud_pruebas_tenant_isolation';
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'crm_solicitud_pruebas' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE crm_solicitud_pruebas ENABLE ROW LEVEL SECURITY';
    EXECUTE format('DROP POLICY IF EXISTS %I ON crm_solicitud_pruebas', pol_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm_solicitud_pruebas FOR ALL USING (
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
SELECT p.id, 'pruebas_solicitud', true, true, true, true, true
FROM crm_access_profiles p
WHERE p.system_key = 'admin' OR p.is_system = true
ON CONFLICT (profile_id, module_id) DO NOTHING;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'pruebas_solicitud', false, false, false, false, false
FROM crm_access_profiles p
WHERE (p.system_key IS NULL OR p.system_key NOT IN ('admin', 'guest'))
  AND p.is_system = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_access_profile_permissions x
    WHERE x.profile_id = p.id AND x.module_id = 'pruebas_solicitud'
  );

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'pruebas_solicitud', true, true, false, true, false
FROM crm_access_profiles p
WHERE p.system_key = 'guest'
ON CONFLICT (profile_id, module_id) DO UPDATE SET
  can_menu = EXCLUDED.can_menu,
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

COMMIT;
