import type {
  AccessProfile,
  MenuModulePermission,
  ModulePermissionFlags,
} from '../types/access-profile.js'
import { isSystemAccessProfile } from './access-profile-admin.js'
import {
  MODULE_LABELS,
  PERMISSION_ACTION_LABELS,
  type MenuModuleId,
  type PermissionAction,
} from './menu-modules.js'
import { permissionMap } from './permissions.js'
import { badRequest } from '../middleware/errors.js'

const ACTIONS: PermissionAction[] = ['menu', 'view', 'create', 'edit', 'delete']

export function actorGrantCeiling(
  actorProfile: AccessProfile | null | undefined,
  isPlatformOperator: boolean,
): Map<string, ModulePermissionFlags> | null {
  if (isPlatformOperator) return null
  if (!actorProfile) return new Map()
  if (isSystemAccessProfile(actorProfile)) return null
  return permissionMap(actorProfile.permissions)
}

function moduleHasAnyGrant(flags: ModulePermissionFlags | undefined): boolean {
  if (!flags) return false
  return ACTIONS.some((action) => flags[action])
}

function clampFlags(
  requested: ModulePermissionFlags,
  ceiling: ModulePermissionFlags | undefined,
): ModulePermissionFlags {
  if (!ceiling) return requested
  return {
    menu: requested.menu && ceiling.menu,
    view: requested.view && ceiling.view,
    create: requested.create && ceiling.create,
    edit: requested.edit && ceiling.edit,
    delete: requested.delete && ceiling.delete,
  }
}

function moduleLabel(moduleId: string): string {
  return MODULE_LABELS[moduleId as MenuModuleId] ?? moduleId
}

export function filterPermissionsByActorGrant(
  permissions: MenuModulePermission[],
  actorProfile: AccessProfile | null | undefined,
  isPlatformOperator: boolean,
): MenuModulePermission[] {
  const ceiling = actorGrantCeiling(actorProfile, isPlatformOperator)
  if (!ceiling) return permissions

  const result: MenuModulePermission[] = []
  for (const perm of permissions) {
    const max = ceiling.get(perm.moduleId)
    if (!moduleHasAnyGrant(max)) continue
    result.push({
      ...perm,
      label: perm.label ?? moduleLabel(perm.moduleId),
      flags: clampFlags(perm.flags, max),
    })
  }
  return result
}

export function mergePermissionsPreservingHiddenModules(
  existing: MenuModulePermission[],
  requested: MenuModulePermission[],
  actorProfile: AccessProfile | null | undefined,
  isPlatformOperator: boolean,
): MenuModulePermission[] {
  if (isPlatformOperator) return requested

  const ceiling = actorGrantCeiling(actorProfile, isPlatformOperator)
  if (!ceiling) return requested

  const grantableIds = new Set(
    [...ceiling.entries()]
      .filter(([, flags]) => moduleHasAnyGrant(flags))
      .map(([moduleId]) => moduleId),
  )

  const filtered = filterPermissionsByActorGrant(requested, actorProfile, isPlatformOperator)
  const preserved = existing.filter((perm) => !grantableIds.has(perm.moduleId))

  return [...preserved, ...filtered]
}

export function assertPermissionsGrantableByActor(
  permissions: MenuModulePermission[],
  actorProfile: AccessProfile | null | undefined,
  isPlatformOperator: boolean,
): void {
  if (isPlatformOperator) return

  const ceiling = actorGrantCeiling(actorProfile, isPlatformOperator)
  if (!ceiling) return

  for (const perm of permissions) {
    const max = ceiling.get(perm.moduleId)
    if (!moduleHasAnyGrant(max)) {
      if (moduleHasAnyGrant(perm.flags)) {
        throw badRequest(
          `No puedes asignar permisos del módulo «${moduleLabel(perm.moduleId)}» porque tu perfil no lo incluye.`,
        )
      }
      continue
    }
    for (const action of ACTIONS) {
      if (perm.flags[action] && !max![action]) {
        throw badRequest(
          `No puedes otorgar «${PERMISSION_ACTION_LABELS[action]}» en «${moduleLabel(perm.moduleId)}».`,
        )
      }
    }
  }
}
