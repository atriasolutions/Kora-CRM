# Kora CRM — Base de datos PostgreSQL

Paquete baseline v1 alineado con [`docs/DATABASE_DESIGN.md`](../docs/DATABASE_DESIGN.md) v3.0.

## Requisitos

- PostgreSQL **15+** (probado en 14.19+)
- Cliente `psql`, `pg_dump`, `pg_restore`, `createdb`

## Instalación rápida

```bash
cd database/postgres
chmod +x install_all.sh backup_create.sh backup_restore.sh pg_tool.sh

# Todo en uno: crear BD, schema, seed, verificaciones y respaldo de prueba
./install_all.sh
```

O paso a paso:

```bash
# 1. Crear base de datos
createdb kora_crm

# 2. Schema completo (tablas, índices, triggers, vistas)
psql -d kora_crm -f postgres/kora_crm_full_install.sql

# 3. Datos demo opcionales
psql -d kora_crm -f postgres/kora_crm_seed_demo.sql
```

> **Versiones de cliente:** si `pg_dump` falla por mismatch de versión, los scripts usan [`pg_tool.sh`](postgres/pg_tool.sh) para localizar el binario de Homebrew que coincide con el servidor (ej. `postgresql@16`).

Variables de entorno opcionales:

| Variable | Default |
|----------|---------|
| `PGHOST` | `localhost` |
| `PGPORT` | `5432` |
| `PGUSER` | usuario OS |
| `PGDATABASE` | `kora_crm` |

## Política de integridad

- **Sin `ON DELETE CASCADE`** en ninguna FK.
- Relaciones humanas: FK + columna snapshot (`company_name`, `contact_name`, etc.).
- Borrado de maestros: preferir `deleted_at` (soft delete); hard delete bloqueado por `RESTRICT` si hay hijos vivos.

Ver §2.6 del documento de diseño.

## Archivos

| Archivo | Propósito |
|---------|-----------|
| [`postgres/kora_crm_full_install.sql`](postgres/kora_crm_full_install.sql) | Script maestro: ENUMs, ~40 tablas `crm_*`, índices, triggers snapshot, vista `v_crm_contacts_list` |
| [`postgres/kora_crm_seed_demo.sql`](postgres/kora_crm_seed_demo.sql) | Perfiles, usuarios, empresas, contactos, oportunidad demo + `crm_legacy_id_map` |
| [`postgres/backup_create.sh`](postgres/backup_create.sh) | Respaldo lógico (`pg_dump -Fc`) |
| [`postgres/install_all.sh`](postgres/install_all.sh) | Instalación + verificación + respaldo de prueba |
| [`postgres/pg_tool.sh`](postgres/pg_tool.sh) | Detecta `pg_dump`/`psql` con la misma major que el servidor |

## Respaldo y restauración

```bash
cd postgres
chmod +x backup_create.sh backup_restore.sh

# Crear respaldo
./backup_create.sh

# Restaurar (sobrescribe objetos existentes)
./backup_restore.sh ./backups/kora_crm_YYYYMMDD_HHMMSS.dump
```

Los respaldos se guardan en `postgres/backups/` con checksum SHA-256 opcional.

## Credenciales demo (seed)

| Usuario | Email | Contraseña app |
|---------|-------|----------------|
| María López | maria.lopez@kora.io | `kora123` |

El hash en BD usa `pgcrypto` (`crypt('kora123', gen_salt('bf'))`).

## Mapeo IDs legacy

La tabla `crm_legacy_id_map` traduce ids demo del frontend (`c1`, `co1`, `u1`) a UUID fijos del seed.

## Fuera de alcance (baseline v1)

- API REST / ORM
- Multi-tenant activo (`tenant_id` reservado nullable)
- SII / facturación electrónica Chile
- Campos personalizados e integraciones (módulos retirados de la app)
