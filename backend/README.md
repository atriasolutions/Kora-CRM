# Kora CRM — Backend API

API REST en **Node.js + Express + TypeScript** sobre PostgreSQL (`kora_crm`).

## Requisitos

- Node.js 20+
- Base `kora_crm` creada con [`../database/postgres/install_all.sh`](../database/postgres/install_all.sh)

## Inicio rápido

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Servidor: `http://localhost:4000`

## Endpoints (v1)

### Salud

- `GET /health`

### Contactos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/contacts` | Lista paginada (`page`, `pageSize`, `q`, `status`, `companyId`, `archived`) |
| GET | `/api/v1/contacts/:id` | Detalle |
| POST | `/api/v1/contacts` | Crear |
| PATCH | `/api/v1/contacts/:id` | Actualizar |
| DELETE | `/api/v1/contacts/:id` | Soft delete |
| POST | `/api/v1/contacts/:id/archive` | Archivar |
| POST | `/api/v1/contacts/:id/restore` | Restaurar de archivo |

### Empresas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/companies` | Lista paginada |
| GET | `/api/v1/companies/:id` | Detalle |
| POST | `/api/v1/companies` | Crear |
| PATCH | `/api/v1/companies/:id` | Actualizar |
| DELETE | `/api/v1/companies/:id` | Soft delete |
| POST | `/api/v1/companies/:id/archive` | Archivar |
| POST | `/api/v1/companies/:id/restore` | Restaurar |

### Oportunidades

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/opportunities` | Lista paginada (`page`, `pageSize`, `q`, `stage`, `outcome`, `companyId`, `contactId`, `archived`) |
| GET | `/api/v1/opportunities/:id` | Detalle + `lineItems` |
| POST | `/api/v1/opportunities` | Crear (snapshots empresa/contacto, líneas opcionales) |
| PATCH | `/api/v1/opportunities/:id` | Actualizar |
| DELETE | `/api/v1/opportunities/:id` | Soft delete |
| POST | `/api/v1/opportunities/:id/archive` | Archivar |
| POST | `/api/v1/opportunities/:id/restore` | Restaurar |

### Cotizaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/quotes` | Lista paginada (`page`, `pageSize`, `q`, `status`, `opportunityId`, `companyId`, `archived`) |
| GET | `/api/v1/quotes/:id` | Detalle + `lineItems` |
| POST | `/api/v1/quotes` | Crear (`code` auto `COT-YYYY-NNNN` si se omite) |
| PATCH | `/api/v1/quotes/:id` | Actualizar |
| DELETE | `/api/v1/quotes/:id` | Soft delete |
| POST | `/api/v1/quotes/:id/archive` | Archivar |
| POST | `/api/v1/quotes/:id/restore` | Restaurar |

### Auditoría (demo)

Headers opcionales:

- `X-User-Id` — UUID de usuario
- `X-User-Name` — nombre para `created_by_name` / `updated_by_name`

Por defecto usa `DEMO_USER_ID` del `.env` (María López del seed).

## Respuesta JSON

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 25, "total": 3, "totalPages": 1 }
}
```

Los objetos usan **camelCase** compatible con el frontend (`company`, `companyId`, `createdAt`, etc.).

## Integración frontend

En `frontend/vite.config.ts`, descomenta el proxy:

```ts
'/api': { target: 'http://localhost:4000', changeOrigin: true },
```

## Próximos módulos

Auth JWT, actividades, facturas, permisos por perfil.
