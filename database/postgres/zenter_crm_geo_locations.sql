-- Catálogo geográfico Chile (regiones y comunas)
-- Ejecutar después de kora_crm_full_install.sql en instalaciones existentes.

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

ALTER TABLE crm_organization_settings
  ADD COLUMN IF NOT EXISTS region VARCHAR(128);

ALTER TABLE crm_organization_settings
  ADD COLUMN IF NOT EXISTS commune VARCHAR(128);

-- El seed de regiones/comunas se carga automáticamente al primer GET /api/v1/geo/chile
