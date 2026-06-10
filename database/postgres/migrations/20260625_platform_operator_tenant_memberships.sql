-- Membresía activa obligatoria para operadores de plataforma en todos los tenants activos.
BEGIN;

INSERT INTO crm_tenant_memberships (tenant_id, user_id, profile_id, status, is_default)
SELECT
  t.id,
  u.id,
  COALESCE(
    (SELECT p.id FROM crm_access_profiles p
     WHERE p.tenant_id = t.id AND p.is_system = true LIMIT 1),
    (SELECT p.id FROM crm_access_profiles p
     WHERE p.tenant_id = t.id AND lower(p.name) = 'administrador'
     ORDER BY p.is_system DESC, p.updated_at ASC LIMIT 1),
    (SELECT p.id FROM crm_access_profiles p
     WHERE p.tenant_id = t.id
     ORDER BY p.is_system DESC, p.updated_at ASC LIMIT 1)
  ),
  'active',
  false
FROM crm_users u
CROSS JOIN crm_tenants t
WHERE u.is_platform_operator = true
  AND u.deleted_at IS NULL
  AND t.status = 'active'
  AND EXISTS (SELECT 1 FROM crm_access_profiles p WHERE p.tenant_id = t.id)
ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET status = 'active'::crm_membership_status,
      profile_id = EXCLUDED.profile_id;

COMMIT;
