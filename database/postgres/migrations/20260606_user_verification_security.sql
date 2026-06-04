-- Estado intermedio: cuenta creada, pendiente de activar por correo.
ALTER TYPE crm_user_status ADD VALUE IF NOT EXISTS 'Por verificar';

CREATE TABLE IF NOT EXISTS crm_user_verification_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  purpose     VARCHAR(32) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_user_verification_tokens_purpose_chk
    CHECK (purpose IN ('account_setup', 'password_reset'))
);

CREATE INDEX IF NOT EXISTS idx_user_verification_tokens_user
  ON crm_user_verification_tokens(user_id, purpose)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_security_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt      VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS crm_user_security_answers (
  user_id       UUID PRIMARY KEY REFERENCES crm_users(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES crm_security_questions(id) ON DELETE RESTRICT,
  answer_hash   VARCHAR(255) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO crm_security_questions (id, prompt, sort_order) VALUES
  ('a1000001-0001-4001-8001-000000000001', '¿Nombre de tu primera mascota?', 1),
  ('a1000001-0001-4001-8001-000000000002', '¿Ciudad donde naciste?', 2),
  ('a1000001-0001-4001-8001-000000000003', '¿Nombre de tu colegio de enseñanza media?', 3),
  ('a1000001-0001-4001-8001-000000000004', '¿Modelo de tu primer auto?', 4),
  ('a1000001-0001-4001-8001-000000000005', '¿Nombre de soltera de tu madre?', 5)
ON CONFLICT (id) DO NOTHING;
