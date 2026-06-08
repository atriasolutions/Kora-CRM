import type { Request } from 'express'

import { badRequest, forbidden } from '../middleware/errors.js'
import type { RequestWithAuth } from '../middleware/auth-session.js'
import { canModulePermission } from '../lib/permissions.js'
import type { MenuModuleId } from '../lib/menu-modules.js'
import {
  ensureEntityFilesTable,
  listEntityFiles,
  replaceEntityFiles,
} from '../repositories/entity-files.repository.js'
import type {
  EntityFileInput,
  EntityFileType,
  SyncEntityFilesInput,
} from '../types/entity-file.js'

const MAX_FILES = 30
const MAX_BYTES = 10 * 1024 * 1024

const MODULE_BY_ENTITY: Record<EntityFileType, MenuModuleId> = {
  empresa: 'empresas',
  contacto: 'contactos',
  inventario: 'inventario',
  compra: 'compras',
  factura: 'facturacion',
  cotizacion: 'cotizaciones',
  oportunidad: 'oportunidades',
  proyecto: 'proyectos',
  solicitud: 'solicitudes',
}

function assertModuleAccess(
  req: Request,
  entityType: EntityFileType,
  action: 'view' | 'edit',
): void {
  const profile = (req as RequestWithAuth).authProfile
  const moduleId = MODULE_BY_ENTITY[entityType]
  if (!canModulePermission(profile, moduleId, action)) {
    throw forbidden('No tienes permiso para gestionar archivos en este módulo.')
  }
}

function validateFilesPayload(files: EntityFileInput[]): void {
  if (files.length > MAX_FILES) {
    throw badRequest(`Máximo ${MAX_FILES} archivos por registro.`)
  }
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      throw badRequest(`«${file.name}» supera el límite de 10 MB.`)
    }
    if (!file.dataUrl?.trim()) {
      throw badRequest(
        `«${file.name}» no tiene contenido almacenable. Vuelve a subir el archivo.`,
      )
    }
    if (!file.dataUrl.startsWith('data:')) {
      throw badRequest(`Formato de archivo no válido para «${file.name}».`)
    }
  }
}

export async function getEntityFilesForRequest(
  req: Request,
  entityType: EntityFileType,
  entityId: string,
) {
  assertModuleAccess(req, entityType, 'view')
  await ensureEntityFilesTable()
  return listEntityFiles(entityType, entityId)
}

export async function syncEntityFilesForRequest(
  req: Request,
  input: SyncEntityFilesInput,
) {
  assertModuleAccess(req, input.entityType, 'edit')
  validateFilesPayload(input.files)
  await ensureEntityFilesTable()

  const auth = (req as RequestWithAuth).auditActor
  const entityLabel = input.entityLabel?.trim() || ''

  return replaceEntityFiles({
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel,
    uploadedById: auth.userId,
    uploadedByName: auth.userName,
    files: input.files.map((file) => ({
      id: file.id?.trim() || undefined,
      name: file.name.trim(),
      size: file.size,
      mimeType: file.mimeType?.trim() || undefined,
      storageKey: file.dataUrl!.trim(),
      uploadedByName: file.uploadedBy?.trim() || auth.userName,
    })),
  })
}
