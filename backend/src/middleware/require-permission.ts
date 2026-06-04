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
import { getAuthProfile } from './auth-session.js'

export function requirePermission(moduleId: MenuModuleId, action: PermissionAction) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const profile = getAuthProfile(req)
    if (!canModulePermission(profile, moduleId, action)) {
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
]

/** Permite listar usuarios activos para campos «Asignado a» sin acceso al módulo Usuarios. */
export function requireAssigneeLookup() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const profile = getAuthProfile(req)
    if (isSystemAccessProfile(profile)) {
      next()
      return
    }
    const allowed = ASSIGNEE_LOOKUP_MODULES.some(
      (moduleId) =>
        canModulePermission(profile, moduleId, 'view') ||
        canModulePermission(profile, moduleId, 'create') ||
        canModulePermission(profile, moduleId, 'edit'),
    )
    if (!allowed) {
      next(
        forbidden(
          'No tienes permiso para consultar el directorio de usuarios asignables.',
        ),
      )
      return
    }
    next()
  }
}
