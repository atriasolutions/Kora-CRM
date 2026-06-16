-- Aislamiento categoría ↔ producto por tenant.
-- Corrige datos cruzados y bloquea futuras asignaciones entre instancias.

BEGIN;

-- 1) Reparar productos con category_id de otro tenant (o categoría inexistente)
DO $$
DECLARE
  r RECORD;
  target_category_id UUID;
  target_category_name TEXT;
BEGIN
  FOR r IN
    SELECT
      p.id AS product_id,
      p.tenant_id AS product_tenant_id,
      c.id AS current_category_id,
      c.tenant_id AS current_category_tenant_id,
      c.name AS current_category_name
    FROM crm_products p
    LEFT JOIN crm_product_categories c ON c.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND p.category_id IS NOT NULL
      AND (c.id IS NULL OR c.tenant_id IS DISTINCT FROM p.tenant_id)
  LOOP
    target_category_name := COALESCE(NULLIF(trim(r.current_category_name), ''), 'General');

    SELECT id
    INTO target_category_id
    FROM crm_product_categories
    WHERE tenant_id = r.product_tenant_id
      AND deleted_at IS NULL
      AND lower(trim(name)) = lower(trim(target_category_name))
    ORDER BY active DESC, created_at ASC
    LIMIT 1;

    IF target_category_id IS NULL THEN
      INSERT INTO crm_product_categories (tenant_id, name, active)
      VALUES (r.product_tenant_id, target_category_name, true)
      RETURNING id INTO target_category_id;
    END IF;

    UPDATE crm_products
    SET category_id = target_category_id,
        updated_at = now()
    WHERE id = r.product_id;
  END LOOP;
END $$;

-- 2) Trigger: category_id debe pertenecer al mismo tenant que el producto
CREATE OR REPLACE FUNCTION crm_enforce_product_category_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM crm_product_categories c
    WHERE c.id = NEW.category_id
      AND c.tenant_id = NEW.tenant_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'category_id debe pertenecer al mismo tenant que el producto'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_products_category_tenant ON crm_products;
CREATE TRIGGER trg_crm_products_category_tenant
  BEFORE INSERT OR UPDATE OF category_id, tenant_id ON crm_products
  FOR EACH ROW
  EXECUTE FUNCTION crm_enforce_product_category_tenant();

COMMIT;
