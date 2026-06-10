-- Perfil Invitado: bitácora solo menú + visualización (sin crear/editar).

BEGIN;

UPDATE crm_access_profile_permissions perm
SET can_menu = true,
    can_view = true,
    can_create = false,
    can_edit = false,
    can_delete = false
FROM crm_access_profiles p
WHERE perm.profile_id = p.id
  AND p.system_key = 'guest'
  AND perm.module_id = 'bitacora';

COMMIT;
