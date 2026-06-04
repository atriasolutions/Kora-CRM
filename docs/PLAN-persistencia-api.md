# Plan: persistencia API (notas + sin overrides locales)

## Recomendación aplicada

1. **Notas en PostgreSQL** (`crm_entity_notes` + `/api/v1/entity-notes`) — base transversal para todos los módulos con pestaña Notas.
2. **Overrides locales desactivados** cuando `isApiEnabled()` — la API/BD es la única fuente de verdad.

## Fase 1 — Hecho

| Área | Cambio |
|------|--------|
| Notas | Migración `20260605_entity_notes.sql`, CRUD API, `mergeEntityNotes` / `useEntityNotes` vía API |
| Overrides detalle | `isLocalDetailStorageActive()` en empresa, compra, factura, ingreso, producto, usuario |
| Journeys | Compra, factura, proyecto: no leer/escribir LS en API |
| Proyecto relaciones | `resolveProjectRelations` usa campos API; `saveProjectRelationsOverride` no-op |
| Plan de trabajo | `saveProjectWorkPlan` no-op en API (carga ya vacía) |
| Limpieza LS | `v4` incluye `crm-company-details` y notas legacy |

## Scopes de notas (12)

`contacto`, `empresa`, `oportunidad`, `cotizacion`, `factura`, `compra`, `producto`, `inventario`, `recepcion`, `actividad`, `proyecto`, `usuario`

## Fase 2 — Pendiente por módulo

| Módulo | Qué falta en API |
|--------|------------------|
| Proyectos | Plan de trabajo (`crm_project_work_*`) — hoy solo LS/mock |
| Oportunidades | Journey local (`opportunity-journey.ts`) si aún se usa en UI |
| Cotizaciones | Journey ya no-op; validar historial de estados 100% API |
| Stock / registries | Sincronizar líneas de ingresos sin depender de LS (`stock-receipt-lines-registry`) |
| Contactos | Overrides ya no-op; revisar campos hardcodeados en `buildContactDetailFromListItem` |

## Fase 3 — Calidad

- Tests API: notas (crear/listar/borrar) y permisos por módulo
- Migración de notas LS → BD (script one-shot si hay datos legacy antes de cleanup)
- Embeddar notas en GET detalle (opcional) para reducir round-trips

## Cómo probar

1. Aplicar migración en Postgres.
2. Reiniciar backend.
3. En detalle (ej. empresa): crear nota → refrescar → debe persistir.
4. Verificar en BD: `SELECT * FROM crm_entity_notes WHERE entity_id = '…'`.
5. DevTools → Application: no debe reaparecer `crm-entity-notes` tras cleanup v4.
