-- Módulo Boleta: comprobante interno de venta (sin SII)
BEGIN;

DO $$ BEGIN
  CREATE TYPE crm_boleta_status AS ENUM ('Borrador', 'Emitida', 'Anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crm_boletas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID,
  number                VARCHAR(64) NOT NULL,
  buyer_name            VARCHAR(255) NOT NULL DEFAULT '',
  buyer_tax_id          VARCHAR(64) NOT NULL DEFAULT '',
  company_id            UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  company_name          VARCHAR(255) NOT NULL DEFAULT '',
  contact_id            UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  contact_name          VARCHAR(255) NOT NULL DEFAULT '',
  issue_date            DATE,
  status                crm_boleta_status NOT NULL DEFAULT 'Borrador',
  payment_method        VARCHAR(64),
  amount_cents          BIGINT NOT NULL DEFAULT 0,
  global_discount_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,
  taxable_amount_cents  BIGINT NOT NULL DEFAULT 0,
  exempt_amount_cents   BIGINT NOT NULL DEFAULT 0,
  tax_amount_cents      BIGINT NOT NULL DEFAULT 0,
  exchange_rate_uf      NUMERIC(18,4),
  exchange_rate_usd     NUMERIC(18,4),
  exchange_rate_eur     NUMERIC(18,4),
  exchange_rate_date    DATE,
  owner_user_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  owner_name            VARCHAR(255),
  notes                 TEXT,
  printed_at            TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  archived_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  created_by_name       VARCHAR(255),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_id         UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  updated_by_name       VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_boletas_tenant_number_active_uidx
  ON crm_boletas (tenant_id, number)
  WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_boletas_tenant_status_idx
  ON crm_boletas (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS crm_boletas_tenant_updated_idx
  ON crm_boletas (tenant_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS crm_boleta_line_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boleta_id             UUID NOT NULL REFERENCES crm_boletas(id) ON DELETE RESTRICT,
  product_id            UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name          VARCHAR(255) NOT NULL DEFAULT '',
  sku                   VARCHAR(64) NOT NULL DEFAULT '',
  description           TEXT,
  quantity              NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price_cents      BIGINT NOT NULL DEFAULT 0,
  discount_pct          NUMERIC(5,2) DEFAULT 0,
  total_cents           BIGINT NOT NULL DEFAULT 0,
  sort_order            INT NOT NULL DEFAULT 0,
  price_currency        VARCHAR(8),
  unit_price_original   NUMERIC(18,4),
  subject_to_vat        BOOLEAN NOT NULL DEFAULT true,
  deferred_payment      BOOLEAN NOT NULL DEFAULT false,
  deferred_payment_text VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS crm_boleta_line_items_boleta_idx
  ON crm_boleta_line_items (boleta_id, sort_order);

ALTER TABLE crm_stock_reservations
  ADD COLUMN IF NOT EXISTS boleta_id UUID REFERENCES crm_boletas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS boleta_number VARCHAR(64) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_crm_stock_reservations_boleta
  ON crm_stock_reservations (boleta_id)
  WHERE boleta_id IS NOT NULL;

ALTER TYPE crm_activity_related_type ADD VALUE IF NOT EXISTS 'boleta';

ALTER TABLE crm_access_profile_permissions
  DROP CONSTRAINT IF EXISTS crm_app_module_id_check;

ALTER TABLE crm_access_profile_permissions
  ADD CONSTRAINT crm_app_module_id_check CHECK (
    module_id IN (
      'dashboard','contactos','empresas','oportunidades','cotizaciones',
      'facturacion','boletas','actividades','proyectos','solicitudes','bitacora',
      'pruebas_solicitud','compras','ingresos','inventario','productos',
      'reportes','usuarios','perfiles','configuracion'
    )
  );

DO $$
DECLARE
  pol_name TEXT := 'crm_boletas_tenant_isolation';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'crm_boletas'
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE crm_boletas ENABLE ROW LEVEL SECURITY';
    EXECUTE format('DROP POLICY IF EXISTS %I ON crm_boletas', pol_name);
    EXECUTE format(
      'CREATE POLICY %I ON crm_boletas FOR ALL USING (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      ) WITH CHECK (
        tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
      )',
      pol_name
    );
  END IF;
END $$;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'boletas', true, true, true, true, true
FROM crm_access_profiles p
WHERE p.system_key = 'admin' OR p.is_system = true
ON CONFLICT (profile_id, module_id) DO NOTHING;

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'boletas', false, false, false, false, false
FROM crm_access_profiles p
WHERE (p.system_key IS NULL OR p.system_key NOT IN ('admin', 'guest'))
  AND p.is_system = false
  AND NOT EXISTS (
    SELECT 1 FROM crm_access_profile_permissions x
    WHERE x.profile_id = p.id AND x.module_id = 'boletas'
  );

INSERT INTO crm_access_profile_permissions
  (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
SELECT p.id, 'boletas', true, true, true, true, false
FROM crm_access_profiles p
WHERE p.system_key = 'guest'
ON CONFLICT (profile_id, module_id) DO UPDATE SET
  can_menu = EXCLUDED.can_menu,
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete;

COMMIT;
