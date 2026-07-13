-- Fecha de nacimiento opcional en usuarios (global por persona).

BEGIN;

ALTER TABLE crm_users
  ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN crm_users.birth_date IS
  'Fecha de nacimiento del usuario (opcional). Una por persona; visible solo a miembros del tenant actual.';

COMMIT;
