-- =============================================================================
-- Kora CRM — PostgreSQL baseline v1
-- Script maestro de instalación (schema + índices + triggers + vistas)
--
-- Política: SIN ON DELETE CASCADE. FK con RESTRICT o SET NULL + snapshots.
-- Requisitos: PostgreSQL 15+
--
-- Uso:
--   psql -U postgres -d kora_crm -f kora_crm_full_install.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Extensiones
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. Tipos ENUM
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE crm_contact_status AS ENUM ('Lead', 'Prospecto', 'Cliente', 'Proveedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_company_lifecycle AS ENUM ('Prospecto', 'Cliente', 'Proveedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_company_operational_status AS ENUM ('Activa', 'Inactiva');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_user_status AS ENUM ('Activo', 'Invitado', 'Inactivo', 'Por verificar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_opportunity_customer_kind AS ENUM ('contacto', 'empresa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_opportunity_outcome AS ENUM ('Abierta', 'Ganada', 'Perdida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_activity_related_type AS ENUM (
    'contacto', 'empresa', 'oportunidad', 'cotizacion', 'compra',
    'factura', 'proyecto', 'ingreso', 'producto', 'inventario'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_activity_status AS ENUM ('Pendiente', 'En curso', 'Completada', 'Vencida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_invoice_status AS ENUM ('Pagada', 'Pendiente', 'Vencida', 'Borrador', 'Anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_purchase_status AS ENUM ('Borrador', 'Emitida', 'Confirmada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_stock_receipt_status AS ENUM ('Borrador', 'Confirmado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_product_status AS ENUM ('Activo', 'Agotado', 'Borrador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_inventory_status AS ENUM (
    'En tránsito', 'En stock', 'Stock bajo', 'Quiebre de stock', 'Sin stock', 'Reservado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_stock_reservation_status AS ENUM ('active', 'transferred', 'committed', 'released');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_entity_notes_scope AS ENUM (
    'contacto', 'empresa', 'oportunidad', 'cotizacion', 'factura',
    'actividad', 'proyecto', 'usuario', 'compra', 'ingreso', 'producto', 'inventario'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_report_type AS ENUM ('table', 'dashboard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. Funciones utilitarias
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm_fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION crm_fn_set_updated_at() IS 'Actualiza updated_at en UPDATE';

-- ---------------------------------------------------------------------------
-- 3. Plataforma
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_legacy_id_map (
  legacy_id   VARCHAR(64) PRIMARY KEY,
  entity_type VARCHAR(64) NOT NULL,
  uuid        UUID NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE crm_legacy_id_map IS 'Mapeo ids demo (c1, co1) → UUID para migración';

CREATE TABLE IF NOT EXISTS crm_access_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system   BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_access_profile_permissions (
  profile_id UUID NOT NULL REFERENCES crm_access_profiles(id) ON DELETE RESTRICT,
  module_id  VARCHAR(64) NOT NULL,
  can_menu   BOOLEAN NOT NULL DEFAULT false,
  can_view   BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit   BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (profile_id, module_id),
  CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','actividades','proyectos','solicitudes','compras','ingresos',
      'inventario','productos','reportes','usuarios','perfiles','configuracion'
    )
  )
);

CREATE TABLE IF NOT EXISTS crm_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  email               VARCHAR(320) NOT NULL UNIQUE,
  name                VARCHAR(255) NOT NULL,
  password_hash       VARCHAR(255),
  role                VARCHAR(64),
  profile_id          UUID NOT NULL REFERENCES crm_access_profiles(id) ON DELETE RESTRICT,
  status              crm_user_status NOT NULL DEFAULT 'Invitado',
  avatar_url          TEXT,
  phone               VARCHAR(64),
  department          VARCHAR(128),
  job_title           VARCHAR(128),
  timezone            VARCHAR(64) DEFAULT 'America/Santiago',
  language            VARCHAR(16) DEFAULT 'es',
  two_factor_enabled  BOOLEAN NOT NULL DEFAULT false,
  bio                 TEXT,
  last_login_at       TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  deleted_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_user_auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE RESTRICT,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE RESTRICT,
  device      VARCHAR(255),
  location    VARCHAR(255),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS crm_geo_regions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(128) NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_geo_communes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id   UUID NOT NULL REFERENCES crm_geo_regions(id) ON DELETE CASCADE,
  name        VARCHAR(128) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE (region_id, name)
);

CREATE INDEX IF NOT EXISTS idx_crm_geo_communes_region
  ON crm_geo_communes (region_id);

CREATE TABLE IF NOT EXISTS crm_organization_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID UNIQUE,
  legal_name          VARCHAR(255) NOT NULL DEFAULT '',
  trade_name          VARCHAR(255) NOT NULL DEFAULT '',
  tagline             VARCHAR(255),
  rut                 VARCHAR(32),
  giro                VARCHAR(255),
  address             TEXT,
  city                VARCHAR(128),
  region              VARCHAR(128),
  commune             VARCHAR(128),
  phone               VARCHAR(64),
  email               VARCHAR(320),
  logo_url            TEXT,
  default_vat_percent NUMERIC(5,2) DEFAULT 19,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(32) NOT NULL,
  address     TEXT,
  region      VARCHAR(128),
  commune     VARCHAR(128),
  is_default  BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_warehouses_tenant_code_active_uidx
  ON crm_warehouses (tenant_id, code)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID,
  name        VARCHAR(255) NOT NULL,
  parent_id   UUID REFERENCES crm_product_categories(id) ON DELETE CASCADE,
  active      BOOLEAN NOT NULL DEFAULT true,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_product_categories_parent
  ON crm_product_categories (parent_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_product_categories_tenant_parent_name
  ON crm_product_categories (tenant_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)))
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION crm_enforce_product_category_parent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Una categoría no puede ser padre de sí misma'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM crm_product_categories parent
    WHERE parent.id = NEW.parent_id
      AND parent.tenant_id = NEW.tenant_id
      AND parent.deleted_at IS NULL
      AND parent.parent_id IS NULL
  ) THEN
    RAISE EXCEPTION 'parent_id debe apuntar a una categoría raíz del mismo tenant'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_product_categories_parent ON crm_product_categories;
CREATE TRIGGER trg_crm_product_categories_parent
  BEFORE INSERT OR UPDATE OF parent_id, tenant_id ON crm_product_categories
  FOR EACH ROW
  EXECUTE FUNCTION crm_enforce_product_category_parent();

-- ---------------------------------------------------------------------------
-- 4. CRM core — empresas y contactos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_companies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  name                VARCHAR(255) NOT NULL,
  logo_url            TEXT,
  rut                 VARCHAR(32),
  headquarters_street TEXT,
  industry            VARCHAR(128),
  city                VARCHAR(128),
  employees           VARCHAR(32),
  owner_user_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name          VARCHAR(255),
  website             TEXT NOT NULL DEFAULT '',
  email               VARCHAR(255) NOT NULL DEFAULT '',
  phone               VARCHAR(64) NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  lifecycle           crm_company_lifecycle NOT NULL DEFAULT 'Prospecto',
  operational_status  crm_company_operational_status NOT NULL DEFAULT 'Activa',
  last_activity_at    TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  deleted_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  archived_at         TIMESTAMPTZ,
  archived_by_id      UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_company_addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES crm_companies(id) ON DELETE RESTRICT,
  label           VARCHAR(128),
  street          TEXT,
  city            VARCHAR(128),
  commune         VARCHAR(128),
  region          VARCHAR(128),
  country         VARCHAR(64) DEFAULT 'Chile',
  postal_code     VARCHAR(32),
  lat             NUMERIC(10,7),
  lng             NUMERIC(10,7),
  is_headquarters BOOLEAN NOT NULL DEFAULT false,
  phone           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS crm_company_branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES crm_companies(id) ON DELETE RESTRICT,
  name        VARCHAR(255) NOT NULL,
  address     JSONB,
  phone       VARCHAR(64),
  manager_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  name            VARCHAR(255) NOT NULL,
  subtitle        VARCHAR(255),
  avatar_url      TEXT,
  company_id      UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  company_name    VARCHAR(255) NOT NULL DEFAULT '',
  email           VARCHAR(320),
  phone           VARCHAR(64),
  mobile_phone    VARCHAR(64),
  job_title       VARCHAR(128),
  status          crm_contact_status NOT NULL DEFAULT 'Lead',
  rut             VARCHAR(32),
  street_address  TEXT,
  region          VARCHAR(128),
  commune         VARCHAR(128),
  linked_in       VARCHAR(512),
  source          VARCHAR(128),
  initial_note    TEXT,
  owner_user_id   UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name      VARCHAR(255),
  last_contact_at TIMESTAMPTZ,
  score           INT,
  deleted_at      TIMESTAMPTZ,
  deleted_by_id   UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  archived_at     TIMESTAMPTZ,
  archived_by_id  UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id   UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id   UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name VARCHAR(255)
);

COMMENT ON COLUMN crm_contacts.company_name IS 'Snapshot §2.6: persiste aunque company_id sea NULL';

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  name                VARCHAR(255) NOT NULL,
  customer_kind       crm_opportunity_customer_kind,
  company_id          UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  company_name        VARCHAR(255) NOT NULL DEFAULT '',
  contact_id          UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_name        VARCHAR(255) NOT NULL DEFAULT '',
  amount_cents        BIGINT NOT NULL DEFAULT 0,
  weighted_amount_cents BIGINT NOT NULL DEFAULT 0,
  stage               VARCHAR(64) NOT NULL,
  probability_pct     SMALLINT,
  close_date          DATE,
  owner_user_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name          VARCHAR(255),
  opp_type            VARCHAR(64),
  priority            VARCHAR(32),
  outcome             crm_opportunity_outcome NOT NULL DEFAULT 'Abierta',
  forecast            VARCHAR(64),
  source              VARCHAR(128),
  contact_email       VARCHAR(255) NOT NULL DEFAULT '',
  contact_phone       VARCHAR(64) NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  decision_maker      VARCHAR(255) NOT NULL DEFAULT '',
  competitors         VARCHAR(255) NOT NULL DEFAULT '',
  budget_label        VARCHAR(128) NOT NULL DEFAULT '',
  buying_process      VARCHAR(255) NOT NULL DEFAULT '',
  loss_reason         VARCHAR(255),
  last_activity_at    TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_opportunity_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   UUID NOT NULL REFERENCES crm_opportunities(id) ON DELETE RESTRICT,
  description      TEXT,
  product_name     VARCHAR(255),
  quantity         NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  discount_pct     NUMERIC(5,2) DEFAULT 0,
  total_cents      BIGINT NOT NULL DEFAULT 0,
  sort_order       INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 5b. Productos (catálogo — antes de líneas de venta/compra)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  name                VARCHAR(255) NOT NULL,
  sku                 VARCHAR(64) NOT NULL,
  category_id         UUID REFERENCES crm_product_categories(id) ON DELETE SET NULL,
  product_type        VARCHAR(64),
  unit_of_measure     VARCHAR(32),
  billing_period      VARCHAR(32),
  price_cents         BIGINT NOT NULL DEFAULT 0,
  cost_price_cents    BIGINT,
  stock_qty           INT,
  status              crm_product_status NOT NULL DEFAULT 'Activo',
  track_inventory     BOOLEAN NOT NULL DEFAULT true,
  min_stock           INT,
  max_stock           INT,
  barcode             VARCHAR(64),
  image_url           TEXT,
  deleted_at          TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255),
  UNIQUE (sku)
);

-- ---------------------------------------------------------------------------
-- 5c. Ventas — cotizaciones y facturas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_quotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  code              VARCHAR(64) NOT NULL,
  title             VARCHAR(255) NOT NULL,
  opportunity_id    UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  opportunity_name  VARCHAR(255) NOT NULL DEFAULT '',
  company_id        UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  company_name      VARCHAR(255) NOT NULL DEFAULT '',
  contact_id        UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_name      VARCHAR(255) NOT NULL DEFAULT '',
  amount_cents      BIGINT NOT NULL DEFAULT 0,
  status            VARCHAR(64) NOT NULL,
  valid_until       DATE,
  issue_date        DATE,
  owner_user_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name        VARCHAR(255),
  customer_kind     VARCHAR(32),
  payment_terms     VARCHAR(255) NOT NULL DEFAULT '',
  delivery_terms    VARCHAR(255) NOT NULL DEFAULT '',
  terms             TEXT NOT NULL DEFAULT '',
  deleted_at        TIMESTAMPTZ,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name   VARCHAR(255),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name   VARCHAR(255),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS crm_quote_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id         UUID NOT NULL REFERENCES crm_quotes(id) ON DELETE RESTRICT,
  product_id       UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name     VARCHAR(255) NOT NULL DEFAULT '',
  sku              VARCHAR(64) NOT NULL DEFAULT '',
  description      TEXT,
  quantity         NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  discount_pct     NUMERIC(5,2) DEFAULT 0,
  total_cents      BIGINT NOT NULL DEFAULT 0,
  sort_order       INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  number            VARCHAR(64) NOT NULL UNIQUE,
  client_name       VARCHAR(255) NOT NULL DEFAULT '',
  customer_kind     VARCHAR(32),
  contact_id        UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_name      VARCHAR(255) NOT NULL DEFAULT '',
  company_id        UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  company_name      VARCHAR(255) NOT NULL DEFAULT '',
  quote_id          UUID REFERENCES crm_quotes(id) ON DELETE SET NULL,
  quote_code        VARCHAR(64) NOT NULL DEFAULT '',
  amount_cents      BIGINT NOT NULL DEFAULT 0,
  issue_date        DATE,
  due_date          DATE,
  status            crm_invoice_status NOT NULL DEFAULT 'Borrador',
  owner_user_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name        VARCHAR(255),
  payment_method    VARCHAR(64),
  sii_number        VARCHAR(64),
  deleted_at        TIMESTAMPTZ,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name   VARCHAR(255),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name   VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_invoice_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES crm_invoices(id) ON DELETE RESTRICT,
  product_id       UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name     VARCHAR(255) NOT NULL DEFAULT '',
  sku              VARCHAR(64) NOT NULL DEFAULT '',
  description      TEXT,
  quantity         NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  discount_pct     NUMERIC(5,2) DEFAULT 0,
  total_cents      BIGINT NOT NULL DEFAULT 0,
  sort_order       INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_invoice_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES crm_invoices(id) ON DELETE RESTRICT,
  amount_cents     BIGINT NOT NULL,
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  method           VARCHAR(64),
  status           VARCHAR(32) NOT NULL DEFAULT 'Confirmado',
  reference        VARCHAR(128),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. Operaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  title           VARCHAR(255) NOT NULL,
  activity_type   VARCHAR(64) NOT NULL,
  type_label      VARCHAR(128),
  related_type    crm_activity_related_type NOT NULL,
  related_id      UUID NOT NULL,
  related_name    VARCHAR(255) NOT NULL DEFAULT '',
  company_name    VARCHAR(255) NOT NULL DEFAULT '',
  due_at          TIMESTAMPTZ,
  assignee_user_id UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  assignee_name   VARCHAR(255),
  status          crm_activity_status NOT NULL DEFAULT 'Pendiente',
  priority        VARCHAR(32),
  scheduled_at    TIMESTAMPTZ,
  reminder_at     TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id   UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id   UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  name                VARCHAR(255) NOT NULL,
  client_name         VARCHAR(255) NOT NULL DEFAULT '',
  customer_kind       VARCHAR(32),
  company_id          UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  contact_id          UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  opportunity_id      UUID REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  opportunity_name    VARCHAR(255) NOT NULL DEFAULT '',
  accepted_quote_id   UUID REFERENCES crm_quotes(id) ON DELETE SET NULL,
  quote_code          VARCHAR(64) NOT NULL DEFAULT '',
  progress_pct        SMALLINT NOT NULL DEFAULT 0,
  deadline            DATE,
  manager_user_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  manager_name        VARCHAR(255),
  journey_stage       VARCHAR(64),
  status              VARCHAR(64),
  priority            VARCHAR(32),
  health              VARCHAR(64),
  budget_cents        BIGINT,
  start_date          DATE,
  deleted_at          TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_project_team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES crm_projects(id) ON DELETE RESTRICT,
  user_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  user_name   VARCHAR(255) NOT NULL DEFAULT '',
  role_label  VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS crm_project_work_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES crm_projects(id) ON DELETE RESTRICT,
  name        VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_project_work_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES crm_project_work_groups(id) ON DELETE RESTRICT,
  title       VARCHAR(255) NOT NULL,
  status      VARCHAR(64),
  assignee_name VARCHAR(255),
  due_date    DATE,
  sort_order  INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 8. Compras e inventario
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  reference         VARCHAR(64) NOT NULL UNIQUE,
  supplier_id       UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  supplier_name     VARCHAR(255) NOT NULL DEFAULT '',
  product_summary   TEXT,
  order_date        DATE,
  amount_cents      BIGINT NOT NULL DEFAULT 0,
  status            crm_purchase_status NOT NULL DEFAULT 'Borrador',
  description       TEXT NOT NULL DEFAULT '',
  expected_delivery DATE,
  payment_terms     VARCHAR(255) NOT NULL DEFAULT '',
  warehouse_id      UUID REFERENCES crm_warehouses(id) ON DELETE SET NULL,
  warehouse_name    VARCHAR(255) NOT NULL DEFAULT '',
  delivery_address  TEXT NOT NULL DEFAULT '',
  supplier_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  supplier_contact_name VARCHAR(255) NOT NULL DEFAULT '',
  supplier_email    VARCHAR(255) NOT NULL DEFAULT '',
  supplier_phone    VARCHAR(64) NOT NULL DEFAULT '',
  owner_user_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name        VARCHAR(255),
  deleted_at        TIMESTAMPTZ,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name   VARCHAR(255),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id     UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name   VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_purchase_line_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id      UUID NOT NULL REFERENCES crm_purchases(id) ON DELETE RESTRICT,
  product_id       UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name     VARCHAR(255) NOT NULL DEFAULT '',
  sku              VARCHAR(64) NOT NULL DEFAULT '',
  description      TEXT,
  quantity           NUMERIC(12,3) NOT NULL DEFAULT 1,
  quantity_received  NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  discount_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_cents      BIGINT NOT NULL DEFAULT 0,
  sort_order       INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_stock_receipts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  number              VARCHAR(64) NOT NULL UNIQUE,
  status              crm_stock_receipt_status NOT NULL DEFAULT 'Borrador',
  external_reference  VARCHAR(255),
  purchase_id         UUID REFERENCES crm_purchases(id) ON DELETE SET NULL,
  purchase_reference  VARCHAR(64) NOT NULL DEFAULT '',
  supplier_name       VARCHAR(255) NOT NULL DEFAULT '',
  warehouse_id        UUID REFERENCES crm_warehouses(id) ON DELETE SET NULL,
  warehouse_name      VARCHAR(255) NOT NULL DEFAULT '',
  product_summary     TEXT,
  line_count          INT NOT NULL DEFAULT 0,
  confirmed_at        TIMESTAMPTZ,
  owner_user_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name          VARCHAR(255),
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name     VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id       UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_stock_receipt_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id       UUID NOT NULL REFERENCES crm_stock_receipts(id) ON DELETE RESTRICT,
  product_id       UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name     VARCHAR(255) NOT NULL DEFAULT '',
  sku              VARCHAR(64) NOT NULL DEFAULT '',
  quantity         NUMERIC(12,3) NOT NULL DEFAULT 0,
  sort_order       INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_inventory_positions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  product_id          UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name        VARCHAR(255) NOT NULL DEFAULT '',
  sku                 VARCHAR(64) NOT NULL,
  warehouse_id        UUID REFERENCES crm_warehouses(id) ON DELETE SET NULL,
  warehouse_name      VARCHAR(255) NOT NULL DEFAULT '',
  quantity_on_hand    NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantity_reserved   NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantity_available  NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock           NUMERIC(12,3),
  status              crm_inventory_status,
  last_movement_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku, warehouse_id)
);

CREATE TABLE IF NOT EXISTS crm_stock_movements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_position_id UUID REFERENCES crm_inventory_positions(id) ON DELETE RESTRICT,
  product_id            UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name          VARCHAR(255) NOT NULL DEFAULT '',
  sku                   VARCHAR(64) NOT NULL DEFAULT '',
  movement_type         VARCHAR(64) NOT NULL,
  reference             VARCHAR(255),
  quantity_delta        NUMERIC(12,3) NOT NULL DEFAULT 0,
  reserved_delta        NUMERIC(12,3) NOT NULL DEFAULT 0,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_user_id        UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  author_name           VARCHAR(255),
  source_kind           VARCHAR(64),
  source_id             UUID,
  adjustment_detail     JSONB
);

CREATE TABLE IF NOT EXISTS crm_stock_reservations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_position_id UUID REFERENCES crm_inventory_positions(id) ON DELETE RESTRICT,
  product_id            UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name          VARCHAR(255) NOT NULL DEFAULT '',
  sku                   VARCHAR(64) NOT NULL DEFAULT '',
  qty                   NUMERIC(12,3) NOT NULL,
  quote_id              UUID REFERENCES crm_quotes(id) ON DELETE SET NULL,
  quote_code            VARCHAR(64) NOT NULL DEFAULT '',
  invoice_id            UUID REFERENCES crm_invoices(id) ON DELETE SET NULL,
  invoice_number        VARCHAR(64) NOT NULL DEFAULT '',
  quote_line_id         UUID,
  status                crm_stock_reservation_status NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. Journeys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_entity_journey_states (
  entity_type   VARCHAR(64) NOT NULL,
  entity_id     UUID NOT NULL,
  current_stage VARCHAR(64) NOT NULL,
  is_off_route  BOOLEAN NOT NULL DEFAULT false,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS crm_entity_stage_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      VARCHAR(64) NOT NULL,
  entity_id        UUID NOT NULL,
  stage            VARCHAR(64) NOT NULL,
  entered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  note             TEXT,
  paused_from_main BOOLEAN,
  changed_by_id    UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  changed_by_name  VARCHAR(255)
);

-- ---------------------------------------------------------------------------
-- 10. Transversales
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_entity_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(64) NOT NULL,
  entity_id       UUID NOT NULL,
  body            TEXT NOT NULL,
  mentions        JSONB NOT NULL DEFAULT '[]'::jsonb,
  author_user_id  UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  author_name     VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_entity_notes_entity
  ON crm_entity_notes (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_entity_files (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           VARCHAR(64) NOT NULL,
  entity_id             UUID NOT NULL,
  entity_label_snapshot VARCHAR(255) NOT NULL DEFAULT '',
  file_name             VARCHAR(512) NOT NULL,
  size_bytes            BIGINT,
  mime_type             VARCHAR(128),
  storage_key           TEXT NOT NULL,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by_id        UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  uploaded_by_name      VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS crm_entity_tags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(128) NOT NULL UNIQUE,
  color     VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS crm_entity_tag_links (
  tag_id      UUID NOT NULL REFERENCES crm_entity_tags(id) ON DELETE RESTRICT,
  entity_type VARCHAR(64) NOT NULL,
  entity_id   UUID NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS crm_archived_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(64) NOT NULL,
  entity_id   UUID NOT NULL,
  entity_label_snapshot VARCHAR(255) NOT NULL DEFAULT '',
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by_id UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  archived_by_name VARCHAR(255),
  payload     JSONB
);

CREATE TABLE IF NOT EXISTS crm_recent_views (
  user_id     UUID NOT NULL REFERENCES crm_users(id) ON DELETE RESTRICT,
  entity_type VARCHAR(64) NOT NULL,
  entity_id   UUID NOT NULL,
  entity_label_snapshot VARCHAR(255) NOT NULL DEFAULT '',
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS crm_saved_segments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id          VARCHAR(64) NOT NULL,
  name               VARCHAR(255) NOT NULL,
  filter_definition  JSONB NOT NULL,
  owner_user_id      UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  is_shared          BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11. Reportes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_report_folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  parent_id   UUID REFERENCES crm_report_folders(id) ON DELETE SET NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS crm_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id       UUID REFERENCES crm_report_folders(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  report_type     crm_report_type NOT NULL DEFAULT 'table',
  author_user_id  UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  author_name     VARCHAR(255),
  schedule        VARCHAR(128),
  description     TEXT,
  template_id     VARCHAR(64),
  table_config    JSONB,
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_report_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES crm_reports(id) ON DELETE CASCADE,
  run_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_meta JSONB
);

-- ---------------------------------------------------------------------------
-- 12. Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON crm_contacts(status);
CREATE INDEX IF NOT EXISTS idx_companies_lifecycle ON crm_companies(lifecycle);
CREATE INDEX IF NOT EXISTS idx_companies_rut ON crm_companies(rut);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON crm_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_related ON crm_activities(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_activities_assignee ON crm_activities(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON crm_invoices(quote_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON crm_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_purchase ON crm_stock_receipts(purchase_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON crm_inventory_positions(sku);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_reservation_active_quote_line
  ON crm_stock_reservations (quote_id, quote_line_id)
  WHERE status IN ('active', 'transferred')
    AND quote_line_id IS NOT NULL
    AND quote_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stock_reservations_sku_status
  ON crm_stock_reservations (lower(trim(sku)), status)
  WHERE status IN ('active', 'transferred', 'committed');

CREATE INDEX IF NOT EXISTS idx_stock_movements_factura_sku
  ON crm_stock_movements (source_id, lower(trim(sku)), movement_type)
  WHERE source_kind = 'factura';
CREATE INDEX IF NOT EXISTS idx_reports_table_config ON crm_reports USING GIN (table_config);
CREATE INDEX IF NOT EXISTS idx_legacy_map_entity ON crm_legacy_id_map(entity_type);

-- ---------------------------------------------------------------------------
-- 13. Triggers snapshot (referencia + nombre congelado)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm_fn_snapshot_contact_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name FROM crm_companies WHERE id = NEW.company_id;
    IF NEW.company_name IS NULL OR NEW.company_name = '' THEN
      NEW.company_name := COALESCE((SELECT name FROM crm_companies WHERE id = NEW.company_id), NEW.company_name);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contacts_snapshot_company ON crm_contacts;
CREATE TRIGGER trg_contacts_snapshot_company
  BEFORE INSERT OR UPDATE OF company_id ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION crm_fn_snapshot_contact_company();

CREATE OR REPLACE FUNCTION crm_fn_snapshot_opportunity_refs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name FROM crm_companies WHERE id = NEW.company_id;
  END IF;
  IF NEW.contact_id IS NOT NULL THEN
    SELECT name INTO NEW.contact_name FROM crm_contacts WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opportunities_snapshot ON crm_opportunities;
CREATE TRIGGER trg_opportunities_snapshot
  BEFORE INSERT OR UPDATE OF company_id, contact_id ON crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION crm_fn_snapshot_opportunity_refs();

CREATE OR REPLACE FUNCTION crm_fn_snapshot_quote_refs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT name INTO NEW.opportunity_name FROM crm_opportunities WHERE id = NEW.opportunity_id;
  END IF;
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name FROM crm_companies WHERE id = NEW.company_id;
  END IF;
  IF NEW.contact_id IS NOT NULL THEN
    SELECT name INTO NEW.contact_name FROM crm_contacts WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_snapshot ON crm_quotes;
CREATE TRIGGER trg_quotes_snapshot
  BEFORE INSERT OR UPDATE OF opportunity_id, company_id, contact_id ON crm_quotes
  FOR EACH ROW EXECUTE FUNCTION crm_fn_snapshot_quote_refs();

CREATE OR REPLACE FUNCTION crm_fn_snapshot_invoice_refs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_id IS NOT NULL THEN
    SELECT code INTO NEW.quote_code FROM crm_quotes WHERE id = NEW.quote_id;
  END IF;
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO NEW.company_name FROM crm_companies WHERE id = NEW.company_id;
  END IF;
  IF NEW.contact_id IS NOT NULL THEN
    SELECT name INTO NEW.contact_name FROM crm_contacts WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_snapshot ON crm_invoices;
CREATE TRIGGER trg_invoices_snapshot
  BEFORE INSERT OR UPDATE OF quote_id, company_id, contact_id ON crm_invoices
  FOR EACH ROW EXECUTE FUNCTION crm_fn_snapshot_invoice_refs();

CREATE OR REPLACE FUNCTION crm_fn_snapshot_purchase_supplier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT name INTO NEW.supplier_name FROM crm_companies WHERE id = NEW.supplier_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchases_snapshot ON crm_purchases;
CREATE TRIGGER trg_purchases_snapshot
  BEFORE INSERT OR UPDATE OF supplier_id ON crm_purchases
  FOR EACH ROW EXECUTE FUNCTION crm_fn_snapshot_purchase_supplier();

CREATE OR REPLACE FUNCTION crm_fn_snapshot_stock_receipt_refs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purchase_id IS NOT NULL THEN
    SELECT reference, supplier_name INTO NEW.purchase_reference, NEW.supplier_name
    FROM crm_purchases WHERE id = NEW.purchase_id;
  END IF;
  IF NEW.warehouse_id IS NOT NULL THEN
    SELECT name INTO NEW.warehouse_name FROM crm_warehouses WHERE id = NEW.warehouse_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_receipts_snapshot ON crm_stock_receipts;
CREATE TRIGGER trg_stock_receipts_snapshot
  BEFORE INSERT OR UPDATE OF purchase_id, warehouse_id ON crm_stock_receipts
  FOR EACH ROW EXECUTE FUNCTION crm_fn_snapshot_stock_receipt_refs();

CREATE OR REPLACE FUNCTION crm_fn_snapshot_product_line()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    SELECT name, sku INTO NEW.product_name, NEW.sku FROM crm_products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at triggers on main tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_users','crm_companies','crm_contacts','crm_opportunities','crm_quotes',
    'crm_invoices','crm_products','crm_purchases','crm_stock_receipts','crm_reports'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', replace(t, 'crm_', ''), t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION crm_fn_set_updated_at()',
      replace(t, 'crm_', ''), t
    );
  END LOOP;
END $$;

-- Preguntas de seguridad (activación de cuenta)
INSERT INTO crm_security_questions (id, prompt, sort_order) VALUES
  ('a1000001-0001-4001-8001-000000000001', '¿Nombre de tu primera mascota?', 1),
  ('a1000001-0001-4001-8001-000000000002', '¿Ciudad donde naciste?', 2),
  ('a1000001-0001-4001-8001-000000000003', '¿Nombre de tu colegio de enseñanza media?', 3),
  ('a1000001-0001-4001-8001-000000000004', '¿Modelo de tu primer auto?', 4),
  ('a1000001-0001-4001-8001-000000000005', '¿Nombre de soltera de tu madre?', 5)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 14. Vistas (API / reportes — un campo legible por relación)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_crm_contacts_list AS
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  c.status,
  c.company_id,
  c.company_name AS empresa,
  c.owner_name AS propietario,
  c.created_at,
  c.created_by_name,
  c.updated_at,
  c.updated_by_name
FROM crm_contacts c
WHERE c.deleted_at IS NULL AND c.archived_at IS NULL;

COMMENT ON VIEW v_crm_contacts_list IS 'Lista contactos: empresa = company_name snapshot';

-- ---------------------------------------------------------------------------
-- 15. Comentarios globales
-- ---------------------------------------------------------------------------
COMMENT ON TABLE crm_contacts IS 'Contactos CRM; company_name persiste si empresa eliminada (ON DELETE SET NULL)';
COMMENT ON TABLE crm_companies IS 'Empresas/clientes/proveedores; soft delete vía deleted_at';
COMMENT ON TABLE crm_quotes IS 'Cotizaciones con snapshots de oportunidad, empresa y contacto';

ALTER TABLE crm_opportunities
  ADD COLUMN IF NOT EXISTS primary_quote_id UUID REFERENCES crm_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_primary_quote
  ON crm_opportunities(primary_quote_id)
  WHERE primary_quote_id IS NOT NULL;

ALTER TABLE crm_projects
  ADD COLUMN IF NOT EXISTS work_plan_json JSONB NOT NULL DEFAULT '{"groups":[],"items":[]}'::jsonb;

COMMIT;

-- Fin kora_crm_full_install.sql (archivo histórico: kora_crm_full_install.sql)
