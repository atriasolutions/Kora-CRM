import type { MenuModuleId } from './menu-modules.js'
import { MODULE_LABELS } from './menu-modules.js'
import type { MenuModulePermission } from '../types/access-profile.js'

export const ADMIN_PROFILE_NAME = 'Administrador'
export const GUEST_PROFILE_NAME = 'Invitado'

export type SystemProfileKey = 'admin' | 'guest'

export const ALL_MENU_MODULE_IDS = Object.keys(MODULE_LABELS) as MenuModuleId[]

export function createGuestProfilePermissions(): MenuModulePermission[] {
  return ALL_MENU_MODULE_IDS.map((moduleId) => {
    const label = MODULE_LABELS[moduleId]
    if (moduleId === 'proyectos') {
      return {
        moduleId,
        label,
        flags: { menu: true, view: true, create: false, edit: false, delete: false },
      }
    }
    if (moduleId === 'solicitudes') {
      return {
        moduleId,
        label,
        flags: { menu: true, view: true, create: true, edit: true, delete: false },
      }
    }
    if (moduleId === 'bitacora') {
      return {
        moduleId,
        label,
        flags: { menu: true, view: true, create: false, edit: false, delete: false },
      }
    }
    if (moduleId === 'pruebas_solicitud') {
      return {
        moduleId,
        label,
        flags: { menu: true, view: true, create: false, edit: true, delete: false },
      }
    }
    return {
      moduleId,
      label,
      flags: { menu: false, view: false, create: false, edit: false, delete: false },
    }
  })
}

/** Cupo de usuarios con perfil Invitado = max usuarios activos × factor. */
export const GUEST_USERS_QUOTA_MULTIPLIER = 10

export function maxGuestUsersForTenant(maxActiveUsers: number | null): number | null {
  if (maxActiveUsers == null || maxActiveUsers <= 0) return null
  return maxActiveUsers * GUEST_USERS_QUOTA_MULTIPLIER
}
