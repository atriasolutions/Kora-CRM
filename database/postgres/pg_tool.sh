#!/usr/bin/env bash
# Resuelve pg_dump / pg_restore / psql compatibles con la versión del servidor.
# Uso: source pg_tool.sh && pg_dump_cmd ...

pg_connection_args() {
  echo -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-$(whoami)}"
}

pg_server_major() {
  local args
  args=$(pg_connection_args)
  # shellcheck disable=SC2086
  psql $args -d "${PGDATABASE:-postgres}" -tAc \
    "SELECT (current_setting('server_version_num')::int / 10000)::text" 2>/dev/null \
    || echo "16"
}

find_pg_binary() {
  local name="$1"
  local major
  major="$(pg_server_major)"

  local candidates=(
    "/usr/local/opt/postgresql@${major}/bin/${name}"
    "/opt/homebrew/opt/postgresql@${major}/bin/${name}"
    "/usr/lib/postgresql/${major}/bin/${name}"
  )

  local path
  for path in "${candidates[@]}"; do
    if [[ -x "${path}" ]]; then
      echo "${path}"
      return 0
    fi
  done

  if command -v "${name}" >/dev/null 2>&1; then
    command -v "${name}"
    return 0
  fi

  echo "ERROR: no se encontró ${name} para PostgreSQL ${major}" >&2
  return 1
}

pg_dump_cmd() {
  find_pg_binary pg_dump
}

pg_restore_cmd() {
  find_pg_binary pg_restore
}

psql_cmd() {
  find_pg_binary psql
}
