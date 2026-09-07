import { isApiEnabled } from '@/api/config'
import { listEntityFilesApi, syncEntityFilesApi } from '@/api/entity-files'
import { STORAGE_PREFIX } from '@/config/brand'
import type { EntityFileRecord } from '@/lib/entity-files'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-entity-files`

export type EntityFilesScope =
  | 'empresa'
  | 'contacto'
  | 'inventario'
  | 'compra'
  | 'factura'
  | 'boleta'
  | 'gasto'
  | 'trabajador'
  | 'cotizacion'
  | 'oportunidad'
  | 'proyecto'
  | 'solicitud'
  | 'prueba_caso'

function storageKey(scope: EntityFilesScope, entityId: string): string {
  return `${scope}:${entityId.trim()}`
}

function readAll(): Record<string, EntityFileRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EntityFileRecord[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, EntityFileRecord[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function loadEntityFilesLocal(
  scope: EntityFilesScope,
  entityId: string,
): EntityFileRecord[] | null {
  const entry = readAll()[storageKey(scope, entityId)]
  return entry && Array.isArray(entry) ? entry : null
}

export function persistEntityFilesLocal(
  scope: EntityFilesScope,
  entityId: string,
  files: EntityFileRecord[],
) {
  const all = readAll()
  all[storageKey(scope, entityId)] = files
  writeAll(all)
}

export function removeEntityFilesLocal(scope: EntityFilesScope, entityId: string) {
  const all = readAll()
  const key = storageKey(scope, entityId)
  if (!all[key]) return
  delete all[key]
  writeAll(all)
}

export async function listEntityFiles(
  scope: EntityFilesScope,
  entityId: string,
): Promise<EntityFileRecord[]> {
  return mergeEntityFiles(scope, entityId, [])
}

export async function mergeEntityFiles(
  scope: EntityFilesScope,
  entityId: string,
  seedFiles: EntityFileRecord[],
): Promise<EntityFileRecord[]> {
  if (isApiEnabled()) {
    try {
      return await listEntityFilesApi(scope, entityId)
    } catch {
      return []
    }
  }
  return loadEntityFilesLocal(scope, entityId) ?? seedFiles
}

export async function persistEntityFiles(
  scope: EntityFilesScope,
  entityId: string,
  entityLabel: string,
  files: EntityFileRecord[],
): Promise<EntityFileRecord[]> {
  const persistable = files.filter((f) => f.dataUrl?.trim())

  if (isApiEnabled()) {
    const saved = await syncEntityFilesApi({
      entityType: scope,
      entityId,
      entityLabel,
      files: persistable,
    })
    return saved
  }

  persistEntityFilesLocal(scope, entityId, files)
  return files
}
