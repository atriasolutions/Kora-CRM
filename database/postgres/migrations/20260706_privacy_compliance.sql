-- Cumplimiento Ley 21.719: privacidad, solicitudes ARSOPB, consentimientos e incidentes.

BEGIN;

-- Configuración de privacidad por tenant (responsable del tratamiento)
ALTER TABLE crm_organization_settings
  ADD COLUMN IF NOT EXISTS privacy_policy_url TEXT,
  ADD COLUMN IF NOT EXISTS privacy_contact_email VARCHAR(320),
  ADD COLUMN IF NOT EXISTS dpo_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(32) DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS data_retention_days INT NOT NULL DEFAULT 2555;

-- Derechos del titular en contactos
ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS treatment_opposition BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS treatment_blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_contacts_treatment_blocked
  ON crm_contacts (tenant_id, treatment_blocked_at)
  WHERE treatment_blocked_at IS NOT NULL AND deleted_at IS NULL;

-- Solicitudes de derechos ARSOPB (Art. 11)
CREATE TABLE IF NOT EXISTS crm_privacy_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  request_code          VARCHAR(32) NOT NULL,
  request_type          VARCHAR(32) NOT NULL,
  status                VARCHAR(32) NOT NULL DEFAULT 'pendiente',
  subject_name          VARCHAR(255) NOT NULL,
  subject_email         VARCHAR(320) NOT NULL,
  subject_rut           VARCHAR(32),
  contact_id            UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  channel               VARCHAR(64) NOT NULL DEFAULT 'interno',
  description           TEXT,
  response_notes        TEXT,
  rejection_reason      TEXT,
  due_at                TIMESTAMPTZ NOT NULL,
  extended_due_at       TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name       VARCHAR(255),
  handled_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  handled_by_name       VARCHAR(255),
  CONSTRAINT crm_privacy_requests_type_chk CHECK (
    request_type IN ('acceso', 'rectificacion', 'supresion', 'oposicion', 'portabilidad', 'bloqueo')
  ),
  CONSTRAINT crm_privacy_requests_status_chk CHECK (
    status IN ('pendiente', 'en_proceso', 'completada', 'rechazada', 'prorrogada')
  ),
  UNIQUE (tenant_id, request_code)
);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_tenant_status
  ON crm_privacy_requests (tenant_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_privacy_requests_contact
  ON crm_privacy_requests (tenant_id, contact_id)
  WHERE contact_id IS NOT NULL;

-- Registro de consentimientos (accountability)
CREATE TABLE IF NOT EXISTS crm_privacy_consent_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  subject_type      VARCHAR(32) NOT NULL,
  subject_email     VARCHAR(320) NOT NULL,
  subject_name      VARCHAR(255),
  consent_given     BOOLEAN NOT NULL,
  policy_version    VARCHAR(32) NOT NULL,
  policy_url        TEXT,
  ip_address        INET,
  user_agent        TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_privacy_consent_subject_type_chk CHECK (
    subject_type IN ('trial_lead', 'support_request', 'contact', 'public_form')
  )
);

CREATE INDEX IF NOT EXISTS idx_privacy_consent_email
  ON crm_privacy_consent_records (subject_email, created_at DESC);

-- Registro de incidentes de seguridad (Art. 14 sexies)
CREATE TABLE IF NOT EXISTS crm_security_incidents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID,
  title                   VARCHAR(255) NOT NULL,
  description             TEXT NOT NULL,
  severity                VARCHAR(32) NOT NULL DEFAULT 'medio',
  status                  VARCHAR(32) NOT NULL DEFAULT 'abierto',
  data_categories         TEXT,
  affected_count_estimate INT,
  notified_apdp_at        TIMESTAMPTZ,
  notified_subjects_at    TIMESTAMPTZ,
  measures_taken          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id           UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name         VARCHAR(255),
  CONSTRAINT crm_security_incidents_severity_chk CHECK (
    severity IN ('bajo', 'medio', 'alto', 'critico')
  ),
  CONSTRAINT crm_security_incidents_status_chk CHECK (
    status IN ('abierto', 'en_investigacion', 'notificado', 'cerrado')
  )
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_tenant
  ON crm_security_incidents (tenant_id, status, created_at DESC);

-- RLS en tablas nuevas con tenant_id
DO $$
DECLARE
  t TEXT;
  pol_name TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_privacy_requests', 'crm_security_incidents'] LOOP
    pol_name := t || '_tenant_isolation';
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      ) WITH CHECK (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      )',
      pol_name,
      t
    );
  END LOOP;
END $$;

-- consent_records: tenant_id nullable (leads plataforma); RLS permisivo para plataforma
ALTER TABLE crm_privacy_consent_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_privacy_consent_records_tenant ON crm_privacy_consent_records;
CREATE POLICY crm_privacy_consent_records_tenant ON crm_privacy_consent_records
  FOR ALL USING (
    tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

COMMIT;
