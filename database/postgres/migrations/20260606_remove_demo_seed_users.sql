-- Elimina usuarios demo del seed (Carlos Vega, Ana Ruiz) y avatares generados (Unsplash/Dicebear).
-- El admin inicial (b1000001-...001) se conserva; suele renombrarse en instalaciones reales.

BEGIN;

UPDATE crm_users
SET avatar_url = NULL,
    updated_at = now()
WHERE avatar_url ILIKE '%images.unsplash.com%'
   OR avatar_url ILIKE '%api.dicebear.com%';

UPDATE crm_users
SET deleted_at = now(),
    updated_at = now()
WHERE deleted_at IS NULL
  AND id IN (
    'b1000001-0001-4001-8001-000000000002',
    'b1000001-0001-4001-8001-000000000003'
  )
  AND email IN ('carlos.vega@kora.io', 'ana.ruiz@kora.io');

COMMIT;
