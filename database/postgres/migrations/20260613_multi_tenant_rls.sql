-- Row Level Security por tenant (defensa en profundidad)
-- Requiere: SET LOCAL app.tenant_id antes de consultas sensibles (tenant-query.ts)

BEGIN;

DO $$
DECLARE
  r RECORD;
  pol_name TEXT;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name LIKE 'crm\_%'
      AND c.column_name = 'tenant_id'
      AND c.table_name NOT IN ('crm_tenants', 'crm_tenant_memberships')
  LOOP
    pol_name := r.table_name || '_tenant_isolation';
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, r.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      ) WITH CHECK (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      )',
      pol_name,
      r.table_name
    );
  END LOOP;
END $$;

-- Tablas de plataforma: acceso sin RLS estricto (consultas vía platformQuery)
ALTER TABLE crm_tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_tenants_read ON crm_tenants;
CREATE POLICY crm_tenants_read ON crm_tenants FOR SELECT USING (true);

ALTER TABLE crm_tenant_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_tenant_memberships_read ON crm_tenant_memberships;
CREATE POLICY crm_tenant_memberships_read ON crm_tenant_memberships FOR SELECT USING (true);

COMMIT;
