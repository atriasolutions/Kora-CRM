#!/usr/bin/env bash
# Kora CRM — Crear respaldo PostgreSQL (formato custom pg_dump)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=pg_tool.sh
source "${SCRIPT_DIR}/pg_tool.sh"

BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/backups}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-$(whoami)}"
PGDATABASE="${PGDATABASE:-kora_crm}"

PG_DUMP="$(pg_dump_cmd)"
SERVER_MAJOR="$(pg_server_major)"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT="${BACKUP_DIR}/kora_crm_${TIMESTAMP}.dump"
CHECKSUM="${OUTPUT}.sha256"

echo "Servidor PostgreSQL major: ${SERVER_MAJOR}"
echo "Usando: ${PG_DUMP}"
echo "Respaldo de ${PGDATABASE}@${PGHOST}:${PGPORT} → ${OUTPUT}"

# shellcheck disable=SC2086
"${PG_DUMP}" \
  $(pg_connection_args) \
  -d "${PGDATABASE}" \
  -Fc \
  --no-owner \
  --no-privileges \
  -f "${OUTPUT}"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${OUTPUT}" > "${CHECKSUM}"
  echo "Checksum: ${CHECKSUM}"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${OUTPUT}" > "${CHECKSUM}"
  echo "Checksum: ${CHECKSUM}"
fi

echo "Respaldo completado: ${OUTPUT} ($(du -h "${OUTPUT}" | cut -f1))"
