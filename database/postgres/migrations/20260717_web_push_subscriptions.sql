-- Suscripciones Web Push (Android/Chrome PWA) por usuario y tenant.

BEGIN;

CREATE TABLE IF NOT EXISTS crm_web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_web_push_subscriptions_endpoint_uq UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS crm_web_push_subscriptions_user_idx
  ON crm_web_push_subscriptions (tenant_id, user_id);

COMMENT ON TABLE crm_web_push_subscriptions IS
  'Endpoints Web Push por dispositivo (PWA/Android). Un endpoint es único globalmente.';

COMMIT;
