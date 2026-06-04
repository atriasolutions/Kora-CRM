# Kora CRM

CRM modular para ventas, operaciones e inventario: frontend React, API Express y esquema PostgreSQL.

## Estructura

| Carpeta | Descripción |
|---------|-------------|
| [`frontend/`](frontend/) | UI (Vite + React + TypeScript + Tailwind) |
| [`backend/`](backend/) | API REST (Express + TypeScript + PostgreSQL) |
| [`database/`](database/) | Scripts SQL de instalación y migraciones |
| [`docs/`](docs/) | Documentación adicional |

## Requisitos

- Node.js 20+
- PostgreSQL 15+

## Inicio rápido

1. **Base de datos** — ver [`database/README.md`](database/README.md).
2. **Backend** — `cd backend && cp .env.example .env && npm install && npm run dev` (puerto 4000).
3. **Frontend** — `cd frontend && cp .env.example .env && npm install && npm run dev` (puerto 5173).

Configura `VITE_API_URL` en el frontend o usa el proxy de Vite hacia la API.

## Licencia

Uso interno Atria Solutions — consultar al equipo antes de redistribuir.
