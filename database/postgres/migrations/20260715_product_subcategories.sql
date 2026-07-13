-- Subcategorías opcionales bajo categorías de producto (un nivel).

BEGIN;

ALTER TABLE crm_product_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES crm_product_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_crm_product_categories_parent
  ON crm_product_categories (parent_id)
  WHERE deleted_at IS NULL;

-- Unicidad por nombre dentro del mismo padre (raíz: parent_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_product_categories_tenant_parent_name
  ON crm_product_categories (tenant_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)))
  WHERE deleted_at IS NULL;

-- El padre debe ser categoría raíz del mismo tenant.
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

COMMIT;
