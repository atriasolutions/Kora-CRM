#!/usr/bin/env bash
# Kora CRM — Restaurar respaldo PostgreSQL (pg_restore)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=pg_tool.sh
source "${SCRIPT_DIR}/pg_tool.sh"

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <archivo.dump> [nombre_bd_destino]"
  echo "  CONFIRM=y  — omitir confirmación interactiva"
  exit 1
fi

DUMP_FILE="$1"
PGDATABASE="${2:-${PGDATABASE:-kora_crm}}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-$(whoami)}"

PG_RESTORE="$(pg_restore_cmd)"
PSQL="$(psql_cmd)"

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "No existe el archivo: ${DUMP_FILE}"
  exit 1
fi

CHECKSUM="${DUMP_FILE}.sha256"
if [[ -f "${CHECKSUM}" ]]; then
  if command -v shasum >/dev/null 2>&1; then
    echo "Verificando checksum..."
    shasum -a 256 -c "${CHECKSUM}"
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${CHECKSUM}"
  fi
fi

echo "Servidor PostgreSQL major: $(pg_server_major)"
echo "Usando: ${PG_RESTORE}"
echo "Destino: ${PGDATABASE}@${PGHOST}:${PGPORT}"

if [[ "${CONFIRM:-}" != "y" && "${CONFIRM:-}" != "Y" ]]; then
  read -r -p "¿Continuar? [y/N] " CONFIRM_INPUT
  if [[ "${CONFIRM_INPUT}" != "y" && "${CONFIRM_INPUT}" != "Y" ]]; then
    echo "Cancelado."
    exit 0
  fi
fi

# shellcheck disable=SC2086
if ! "${PSQL}" $(pg_connection_args) -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${PGDATABASE}'" | grep -q 1; then
  echo "Creando base de datos ${PGDATABASE}..."
  # shellcheck disable=SC2086
  createdb $(pg_connection_args) "${PGDATABASE}"
fi

echo "Restaurando ${DUMP_FILE}..."

# shellcheck disable=SC2086
"${PG_RESTORE}" \
  $(pg_connection_args) \
  -d "${PGDATABASE}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${DUMP_FILE}"

echo "Restauración completada en ${PGDATABASE}."
