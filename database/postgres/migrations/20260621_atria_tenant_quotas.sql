-- Cuotas por defecto: instancia Atria (atriasolutions)

INSERT INTO crm_tenant_quotas (
  tenant_id,
  max_active_users,
  max_records_bytes,
  max_files_bytes,
  grace_percent
)
VALUES (
  'a0000001-0001-4001-8001-000000000001',
  NULL,
  (20::bigint * 1024 * 1024 * 1024),
  (50::bigint * 1024 * 1024 * 1024),
  10
)
ON CONFLICT (tenant_id) DO UPDATE SET
  max_records_bytes = EXCLUDED.max_records_bytes,
  max_files_bytes = EXCLUDED.max_files_bytes,
  grace_percent = EXCLUDED.grace_percent,
  updated_at = now();
