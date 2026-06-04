-- Notificaciones en tiempo real (websocket) + historial (lectura por usuario).
-- Ejecutar después de instalar la BD (o en un entorno existente).

CREATE TABLE IF NOT EXISTS crm_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID,
  user_id       UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  type          VARCHAR(64) NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  href          TEXT,
  entity_type   TEXT,
  entity_id     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS crm_notifications_user_unread_idx
  ON crm_notifications (user_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_notifications_user_created_idx
  ON crm_notifications (user_id, created_at DESC);

