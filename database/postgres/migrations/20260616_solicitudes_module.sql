-- Módulo Solicitudes: tablas, enums, org settings, permisos y actividades

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_solicitud_status') THEN
    CREATE TYPE crm_solicitud_status AS ENUM (
      'Nuevo',
      'En Proceso',
      'Detenido por cliente',
      'Detenido Internamente',
      'En espera de Cliente',
      'Entregado a Cliente',
      'Planificación',
      'Cerrado'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_solicitud_priority') THEN
    CREATE TYPE crm_solicitud_priority AS ENUM (
      'Baja',
      'Media',
      'Alta',
      'Urgente'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS crm_solicitudes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  code                VARCHAR(64) NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  status              crm_solicitud_status NOT NULL DEFAULT 'Nuevo',
  priority            crm_solicitud_priority NOT NULL DEFAULT 'Media',
  assignee_user_id    UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  assignee_name       VARCHAR(255) NOT NULL DEFAULT '',
  deleted_at          TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_solicitudes_tenant_code_uidx
  ON crm_solicitudes (tenant_id, code);

CREATE INDEX IF NOT EXISTS crm_solicitudes_tenant_status_idx
  ON crm_solicitudes (tenant_id, status);

CREATE INDEX IF NOT EXISTS crm_solicitudes_tenant_archived_idx
  ON crm_solicitudes (tenant_id, archived_at);

CREATE INDEX IF NOT EXISTS crm_solicitudes_title_search_idx
  ON crm_solicitudes (tenant_id, title);

CREATE TABLE IF NOT EXISTS crm_solicitud_team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id  UUID NOT NULL REFERENCES crm_solicitudes(id) ON DELETE RESTRICT,
  user_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  user_name     VARCHAR(255) NOT NULL DEFAULT '',
  role_label    VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS crm_solicitud_team_members_solicitud_idx
  ON crm_solicitud_team_members (solicitud_id);

ALTER TABLE crm_organization_settings
  ADD COLUMN IF NOT EXISTS default_solicitud_assignee_user_id UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_solicitud_assignee_name VARCHAR(255) NOT NULL DEFAULT '';

ALTER TYPE crm_activity_related_type ADD VALUE IF NOT EXISTS 'solicitud';

ALTER TABLE crm_access_profile_permissions
  DROP CONSTRAINT IF EXISTS crm_app_module_id_check;

ALTER TABLE crm_access_profile_permissions
  ADD CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','actividades','proyectos','solicitudes','compras','ingresos',
      'inventario','productos','reportes','usuarios','perfiles','configuracion'
    )
  );

-- RLS para crm_solicitudes (tenant_id)
DO $$
DECLARE
  pol_name TEXT := 'crm_solicitudes_tenant_isolation';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_solicitudes'
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE crm_solicitudes ENABLE ROW LEVEL SECURITY';
    EXECUTE format('DROP POLICY IF EXISTS %I ON crm_solicitudes', pol_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm_solicitudes FOR ALL USING (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      ) WITH CHECK (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      )',
      pol_name
    );
  END IF;
END $$;

-- Permisos: administradores del sistema obtienen acceso total; resto sin acceso inicial
INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'solicitudes', true, true, true, true, true
FROM crm_access_profiles p
WHERE p.is_system = true
ON CONFLICT (profile_id, module_id) DO NOTHING;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'solicitudes', false, false, false, false, false
FROM crm_access_profiles p
WHERE p.is_system = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_access_profile_permissions x
    WHERE x.profile_id = p.id AND x.module_id = 'solicitudes'
  );

COMMIT;
