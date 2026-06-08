-- Operador de plataforma: acceso cross-tenant e invisibilidad en directorios.
-- Ejecutar tras respaldo. Marcar manualmente al usuario de soporte, por ejemplo:
--   UPDATE crm_users
--   SET is_platform_operator = true, hidden_from_directory = true
--   WHERE lower(email) = 'tu-correo@ejemplo.com';

BEGIN;

ALTER TABLE crm_users
  ADD COLUMN IF NOT EXISTS is_platform_operator BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_from_directory BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_crm_users_platform_operator
  ON crm_users (is_platform_operator)
  WHERE is_platform_operator = true;

COMMIT;
