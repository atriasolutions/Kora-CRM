import type { Request } from 'express'

import { badRequest, forbidden } from '../middleware/errors.js'
import type { RequestWithAuth } from '../middleware/auth-session.js'
import { canModulePermission } from '../lib/permissions.js'
import type { MenuModuleId } from '../lib/menu-modules.js'
import {
  createEntityNote,
  deleteEntityNote,
  ensureEntityNotesTable,
  getEntityNoteEntityType,
  listEntityNotes,
} from '../repositories/entity-notes.repository.js'
import { enrichEntityNotes } from '../services/entity-notes-enrich.service.js'
import type {
  CreateEntityNoteInput,
  EntityNoteType,
} from '../types/entity-note.js'

const MAX_BODY_LENGTH = 100_000

const MODULE_BY_ENTITY: Record<EntityNoteType, MenuModuleId> = {
  contacto: 'contactos',
  empresa: 'empresas',
  oportunidad: 'oportunidades',
  cotizacion: 'cotizaciones',
  factura: 'facturacion',
  compra: 'compras',
  producto: 'productos',
  inventario: 'inventario',
  recepcion: 'ingresos',
  actividad: 'actividades',
  proyecto: 'proyectos',
  solicitud: 'solicitudes',
  usuario: 'usuarios',
}

function assertModuleAccess(
  req: Request,
  entityType: EntityNoteType,
  action: 'view' | 'edit' | 'delete',
): void {
  const profile = (req as RequestWithAuth).authProfile
  const moduleId = MODULE_BY_ENTITY[entityType]
  if (!canModulePermission(profile, moduleId, action)) {
    throw forbidden('No tienes permiso para gestionar notas en este módulo.')
  }
}

function assertBodyLength(body: string): void {
  if (!body.trim()) {
    throw badRequest('La nota no puede estar vacía.')
  }
  if (body.length > MAX_BODY_LENGTH) {
    throw badRequest('La nota supera el tamaño máximo permitido.')
  }
}

export async function getEntityNotesForRequest(
  req: Request,
  entityType: EntityNoteType,
  entityId: string,
) {
  assertModuleAccess(req, entityType, 'view')
  await ensureEntityNotesTable()
  const notes = await listEntityNotes(entityType, entityId)
  return enrichEntityNotes(notes)
}

export async function createEntityNoteForRequest(
  req: Request,
  input: CreateEntityNoteInput,
) {
  assertModuleAccess(req, input.entityType, 'edit')
  assertBodyLength(input.body)
  await ensureEntityNotesTable()
  const auth = (req as RequestWithAuth).auditActor
  return createEntityNote(input, auth)
}

export async function deleteEntityNoteForRequest(req: Request, noteId: string) {
  await ensureEntityNotesTable()
  const entityType = await getEntityNoteEntityType(noteId)
  if (entityType) {
    assertModuleAccess(req, entityType as EntityNoteType, 'delete')
  }
  await deleteEntityNote(noteId)
}
