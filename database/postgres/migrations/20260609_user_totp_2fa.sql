-- Autenticación TOTP (Google Authenticator y apps compatibles).

ALTER TABLE crm_users
  ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS crm_user_totp_challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_totp_challenges_user
  ON crm_user_totp_challenges(user_id, expires_at);

CREATE TABLE IF NOT EXISTS crm_user_totp_pending_setup (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  secret_encrypted    TEXT NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_totp_pending_user
  ON crm_user_totp_pending_setup(user_id);

CREATE TABLE IF NOT EXISTS crm_user_totp_enrollment_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_user_totp_backup_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(255) NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_totp_backup_user
  ON crm_user_totp_backup_codes(user_id)
  WHERE used_at IS NULL;
