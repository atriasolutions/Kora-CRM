#!/usr/bin/env bash
# Kora CRM — Instalación completa: schema + seed + verificación
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=pg_tool.sh
source "${SCRIPT_DIR}/pg_tool.sh"

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-$(whoami)}"
PGDATABASE="${PGDATABASE:-kora_crm}"
RECREATE_DB="${RECREATE_DB:-1}"

PSQL="$(psql_cmd)"
echo "PostgreSQL cliente: ${PSQL} (servidor major $(pg_server_major))"

if [[ "${RECREATE_DB}" == "1" ]]; then
  echo "Recreando base de datos ${PGDATABASE}..."
  # shellcheck disable=SC2086
  dropdb --if-exists $(pg_connection_args) "${PGDATABASE}" 2>/dev/null || true
  # shellcheck disable=SC2086
  createdb $(pg_connection_args) "${PGDATABASE}"
fi

echo "→ kora_crm_full_install.sql"
# shellcheck disable=SC2086
"${PSQL}" $(pg_connection_args) -d "${PGDATABASE}" -v ON_ERROR_STOP=1 \
  -f "${SCRIPT_DIR}/kora_crm_full_install.sql"

echo "→ kora_crm_seed_demo.sql"
# shellcheck disable=SC2086
"${PSQL}" $(pg_connection_args) -d "${PGDATABASE}" -v ON_ERROR_STOP=1 \
  -f "${SCRIPT_DIR}/kora_crm_seed_demo.sql"

echo "→ Verificaciones"
# shellcheck disable=SC2086
"${PSQL}" $(pg_connection_args) -d "${PGDATABASE}" -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'tablas crm_' AS check, count(*)::text AS value
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'crm_%';

SELECT 'sin CASCADE' AS check,
  CASE WHEN count(*) = 0 THEN 'OK' ELSE count(*)::text || ' encontrados' END
FROM (
  SELECT 1
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname LIKE 'crm_%'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) ILIKE '%ON DELETE CASCADE%'
) x;

SELECT 'snapshot contacto' AS check, company_name
FROM crm_contacts
WHERE id = 'd1000001-0001-4001-8001-000000000001';

UPDATE crm_contacts SET company_id = NULL
WHERE id = 'd1000001-0001-4001-8001-000000000001';

SELECT 'snapshot tras null FK' AS check, company_name
FROM crm_contacts
WHERE id = 'd1000001-0001-4001-8001-000000000001';
SQL

echo "→ Respaldo de prueba"
PGDATABASE="${PGDATABASE}" "${SCRIPT_DIR}/backup_create.sh"

echo ""
echo "Instalación completada en ${PGDATABASE}."
