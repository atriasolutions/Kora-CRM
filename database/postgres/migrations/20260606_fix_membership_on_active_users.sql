-- Usuarios ya activos cuya membresía quedó en 'invited' tras activar cuenta (bug pre-fix).
UPDATE crm_tenant_memberships m
SET status = 'active'
FROM crm_users u
WHERE m.user_id = u.id
  AND u.deleted_at IS NULL
  AND u.status = 'Activo'
  AND m.status = 'invited';
