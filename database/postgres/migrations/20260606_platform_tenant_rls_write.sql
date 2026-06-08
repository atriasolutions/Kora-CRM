-- Permite provisioning de tenants trial vía platformQuery (INSERT/UPDATE en tablas de plataforma).
BEGIN;

DROP POLICY IF EXISTS crm_tenants_insert ON crm_tenants;
CREATE POLICY crm_tenants_insert ON crm_tenants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS crm_tenants_update ON crm_tenants;
CREATE POLICY crm_tenants_update ON crm_tenants FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS crm_tenants_delete ON crm_tenants;
CREATE POLICY crm_tenants_delete ON crm_tenants FOR DELETE USING (true);

DROP POLICY IF EXISTS crm_tenant_memberships_insert ON crm_tenant_memberships;
CREATE POLICY crm_tenant_memberships_insert ON crm_tenant_memberships FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS crm_tenant_memberships_update ON crm_tenant_memberships;
CREATE POLICY crm_tenant_memberships_update ON crm_tenant_memberships FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS crm_tenant_memberships_delete ON crm_tenant_memberships;
CREATE POLICY crm_tenant_memberships_delete ON crm_tenant_memberships FOR DELETE USING (true);

COMMIT;
