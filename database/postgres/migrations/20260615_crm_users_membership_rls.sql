-- Usuarios globales (un email) pueden tener membresía en varios tenants.
-- RLS: visible en un tenant si tenant_id coincide O hay membresía activa/invitada.

BEGIN;

DROP POLICY IF EXISTS crm_users_tenant_isolation ON crm_users;

CREATE POLICY crm_users_tenant_isolation ON crm_users
FOR ALL
USING (
  tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR EXISTS (
    SELECT 1
    FROM crm_tenant_memberships m
    WHERE m.user_id = crm_users.id
      AND m.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      AND m.status IN ('active', 'invited', 'disabled')
  )
)
WITH CHECK (
  tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  OR EXISTS (
    SELECT 1
    FROM crm_tenant_memberships m
    WHERE m.user_id = crm_users.id
      AND m.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      AND m.status IN ('active', 'invited', 'disabled')
  )
);

COMMIT;
