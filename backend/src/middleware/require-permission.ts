import type { NextFunction, Request, Response } from 'express'

import { isSystemAccessProfile } from '../lib/access-profile-admin.js'
import { canModulePermission } from '../lib/permissions.js'
import {
  MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  type MenuModuleId,
  type PermissionAction,
} from '../lib/menu-modules.js'
import { forbidden } from './errors.js'
import { getAuditActor } from './audit-actor.js'
import { getAuthProfile } from './auth-session.js'

function hasPermission(
  req: Request,
  moduleId: MenuModuleId,
  action: PermissionAction,
): boolean {
  if (getAuditActor(req).isPlatformOperator) return true
  const profile = getAuthProfile(req)
  return canModulePermission(profile, moduleId, action)
}

export function requirePermission(moduleId: MenuModuleId, action: PermissionAction) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!hasPermission(req, moduleId, action)) {
      const moduleLabel = MODULE_LABELS[moduleId] ?? moduleId
      const actionLabel = PERMISSION_ACTION_LABELS[action] ?? action
      next(
        forbidden(
          `No tienes permiso para ${actionLabel} en ${moduleLabel}.`,
        ),
      )
      return
    }
    next()
  }
}

const ASSIGNEE_LOOKUP_MODULES: MenuModuleId[] = [
  'actividades',
  'contactos',
  'empresas',
  'oportunidades',
  'cotizaciones',
  'proyectos',
  'facturacion',
  'compras',
  'ingresos',
  'productos',
  'inventario',
  'reportes',
  'solicitudes',
  'bitacora',
]

const MENTION_LOOKUP_MODULES: MenuModuleId[] = [
  ...ASSIGNEE_LOOKUP_MODULES,
  'usuarios',
]

function requireAnyModuleAccess(
  req: Request,
  modules: MenuModuleId[],
  forbiddenMessage: string,
  next: NextFunction,
): void {
  if (getAuditActor(req).isPlatformOperator) {
    next()
    return
  }
  const profile = getAuthProfile(req)
  if (isSystemAccessProfile(profile)) {
    next()
    return
  }
  const allowed = modules.some(
    (moduleId) =>
      canModulePermission(profile, moduleId, 'view') ||
      canModulePermission(profile, moduleId, 'create') ||
      canModulePermission(profile, moduleId, 'edit'),
  )
  if (!allowed) {
    next(forbidden(forbiddenMessage))
    return
  }
  next()
}

/** Permite listar usuarios activos para campos «Asignado a» sin acceso al módulo Usuarios. */
export function requireAssigneeLookup() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    requireAnyModuleAccess(
      req,
      ASSIGNEE_LOOKUP_MODULES,
      'No tienes permiso para consultar el directorio de usuarios asignables.',
      next,
    )
  }
}

/** Permite buscar @menciones en notas si el usuario tiene acceso a algún módulo del CRM. */
export function requireMentionLookup() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    requireAnyModuleAccess(
      req,
      MENTION_LOOKUP_MODULES,
      'No tienes permiso para buscar menciones en notas.',
      next,
    )
  }
}
