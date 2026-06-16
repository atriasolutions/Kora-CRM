import { isSystemAccessProfile } from '@/lib/access-profile-admin'
import {
  createPermissionFlags,
  MENU_MODULE_DEFINITIONS,
  type MenuModuleId,
  type MenuModulePermission,
  type ModulePermissionFlags,
  type PermissionAction,
} from '@/lib/menu-modules'
import type { AccessProfile } from '@/types/access-profile'

const ACTIONS: PermissionAction[] = ['menu', 'view', 'create', 'edit', 'delete']

export type ProfileGrantCeiling = Map<MenuModuleId, ModulePermissionFlags> | null

export function buildGrantCeiling(
  actorProfile: AccessProfile | null | undefined,
  isPlatformOperator: boolean,
): ProfileGrantCeiling {
  if (isPlatformOperator) return null
  if (!actorProfile) return new Map()
  if (isSystemAccessProfile(actorProfile)) return null

  const map = new Map<MenuModuleId, ModulePermissionFlags>()
  for (const perm of actorProfile.permissions) {
    map.set(perm.moduleId, { ...perm.flags })
  }
  return map
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

export function canShowModuleInProfileEditor(
  moduleId: MenuModuleId,
  ceiling: ProfileGrantCeiling,
): boolean {
  if (!ceiling) return true
  return moduleHasAnyGrant(ceiling.get(moduleId))
}

export function maxFlagsForModule(
  moduleId: MenuModuleId,
  ceiling: ProfileGrantCeiling,
): ModulePermissionFlags | null {
  if (!ceiling) return null
  return ceiling.get(moduleId) ?? createPermissionFlags()
}

export function createEmptyGrantablePermissions(
  ceiling: ProfileGrantCeiling,
): MenuModulePermission[] {
  return MENU_MODULE_DEFINITIONS.filter((def) =>
    canShowModuleInProfileEditor(def.id, ceiling),
  ).map((def) => ({
    moduleId: def.id,
    label: def.label,
    flags: createPermissionFlags(),
  }))
}

export function permissionsForProfileEditor(
  permissions: MenuModulePermission[],
  ceiling: ProfileGrantCeiling,
): MenuModulePermission[] {
  const byId = new Map(permissions.map((perm) => [perm.moduleId, perm]))
  return MENU_MODULE_DEFINITIONS.filter((def) =>
    canShowModuleInProfileEditor(def.id, ceiling),
  ).map((def) => {
    const existing = byId.get(def.id)
    return {
      moduleId: def.id,
      label: def.label,
      flags: clampFlags(existing?.flags ?? createPermissionFlags(), maxFlagsForModule(def.id, ceiling) ?? undefined),
    }
  })
}

export function mergeEditorPermissionsIntoProfile(
  current: MenuModulePermission[],
  editorPermissions: MenuModulePermission[],
  ceiling: ProfileGrantCeiling,
): MenuModulePermission[] {
  if (!ceiling) return editorPermissions

  const grantableIds = new Set(
    MENU_MODULE_DEFINITIONS.filter((def) =>
      canShowModuleInProfileEditor(def.id, ceiling),
    ).map((def) => def.id),
  )

  const editorById = new Map(editorPermissions.map((perm) => [perm.moduleId, perm]))
  const preserved = current.filter((perm) => !grantableIds.has(perm.moduleId))
  const updatedGrantable = [...grantableIds].map((moduleId) => {
    const def = MENU_MODULE_DEFINITIONS.find((row) => row.id === moduleId)!
    const edited = editorById.get(moduleId)
    return {
      moduleId,
      label: def.label,
      flags: clampFlags(
        edited?.flags ?? createPermissionFlags(),
        maxFlagsForModule(moduleId, ceiling) ?? undefined,
      ),
    }
  })

  return [...preserved, ...updatedGrantable]
}

export function clampPermissionsToGrant(
  permissions: MenuModulePermission[],
  ceiling: ProfileGrantCeiling,
): MenuModulePermission[] {
  if (!ceiling) return permissions
  return permissions
    .map((perm) => {
      if (!canShowModuleInProfileEditor(perm.moduleId, ceiling)) {
        return moduleHasAnyGrant(perm.flags) ? null : perm
      }
      return {
        ...perm,
        flags: clampFlags(perm.flags, maxFlagsForModule(perm.moduleId, ceiling) ?? undefined),
      }
    })
    .filter((perm): perm is MenuModulePermission => perm !== null)
}
