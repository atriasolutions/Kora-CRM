-- Perfiles de sistema por instancia: Administrador (admin) e Invitado (guest).

BEGIN;

ALTER TABLE crm_access_profiles
  ADD COLUMN IF NOT EXISTS system_key VARCHAR(16);

ALTER TABLE crm_access_profiles
  DROP CONSTRAINT IF EXISTS crm_access_profiles_system_key_chk;

ALTER TABLE crm_access_profiles
  ADD CONSTRAINT crm_access_profiles_system_key_chk
  CHECK (system_key IS NULL OR system_key IN ('admin', 'guest'));

CREATE UNIQUE INDEX IF NOT EXISTS crm_access_profiles_tenant_system_key_uq
  ON crm_access_profiles (tenant_id, system_key)
  WHERE system_key IS NOT NULL;

UPDATE crm_access_profiles
SET system_key = 'admin'
WHERE is_system = true
  AND system_key IS NULL;

DO $$
DECLARE
  tenant_rec RECORD;
  guest_id UUID;
  mod_id TEXT;
  modules TEXT[] := ARRAY[
    'dashboard', 'contactos', 'empresas', 'oportunidades', 'cotizaciones',
    'facturacion', 'actividades', 'proyectos', 'solicitudes', 'compras',
    'ingresos', 'inventario', 'productos', 'reportes', 'usuarios', 'perfiles',
    'configuracion'
  ];
BEGIN
  FOR tenant_rec IN
    SELECT id FROM crm_tenants WHERE status <> 'deleted'
  LOOP
    SELECT id INTO guest_id
    FROM crm_access_profiles
    WHERE tenant_id = tenant_rec.id AND system_key = 'guest'
    LIMIT 1;

    IF guest_id IS NULL THEN
      INSERT INTO crm_access_profiles (
        tenant_id, name, description, is_system, system_key, updated_at
      ) VALUES (
        tenant_rec.id,
        'Invitado',
        'Acceso limitado a proyectos (solo lectura) y solicitudes.',
        false,
        'guest',
        now()
      )
      RETURNING id INTO guest_id;

      FOREACH mod_id IN ARRAY modules LOOP
        INSERT INTO crm_access_profile_permissions (
          profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete
        ) VALUES (guest_id, mod_id, false, false, false, false, false)
        ON CONFLICT (profile_id, module_id) DO NOTHING;
      END LOOP;

      UPDATE crm_access_profile_permissions
      SET can_menu = true, can_view = true
      WHERE profile_id = guest_id AND module_id = 'proyectos';

      UPDATE crm_access_profile_permissions
      SET can_menu = true, can_view = true, can_create = true, can_edit = true
      WHERE profile_id = guest_id AND module_id = 'solicitudes';
    END IF;
  END LOOP;
END $$;

COMMIT;
